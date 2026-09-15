import { Router, type IRouter } from "express";
import { eq, inArray, sql, and, or, isNull, gte, lt, SQL } from "drizzle-orm";
import { db, packagesTable, scansTable } from "@workspace/db";
import {
  CreatePackageBody,
  BulkCreatePackagesBody,
  DeletePackageParams,
  ListPackagesQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOperationAccess, isOperationAllowed } from "../middlewares/requireOperationAccess";
import { isFilialAllowed, getAllowedFiliais, canCreateWithFilial } from "../middlewares/requireFilialAccess";
import { validateTbrFormat, tbrValidationMessage, normalizeTbrCode } from "../modules/amazon/tbr";
import { resolveFilialForCity } from "../modules/amazon/filial";
import { resolveRotaForCep, getActiveRoutesForFilial } from "../modules/amazon/rota";
import { logAuditEvent } from "../modules/audit/log";

const router: IRouter = Router();

// GET /packages/lookup?trackingNumber=XXX&operation=LOGGI — must come BEFORE /packages/:id
router.get("/packages/lookup", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  let trackingNumber = (req.query.trackingNumber as string | undefined)?.trim();
  if (!trackingNumber) {
    res.status(400).json({ error: "trackingNumber é obrigatório" });
    return;
  }

  const operation = (req.query.operation as string | undefined)?.trim() ?? "LOGGI";

  // Normaliza (maiúsculas, sem espaços) antes de buscar — o cadastro da
  // AMAZON já grava o código normalizado; sem isso, uma busca digitada em
  // minúsculas ou com espaço extra não encontraria o pacote.
  if (operation === "AMAZON") {
    trackingNumber = normalizeTbrCode(trackingNumber);
  }

  const [pkg] = await db
    .select()
    .from(packagesTable)
    .where(and(
      eq(packagesTable.trackingNumber, trackingNumber),
      eq(packagesTable.operation, operation),
    ))
    .limit(1);

  if (!pkg) {
    res.status(404).json({ error: "Pacote não encontrado" });
    return;
  }

  if (!isFilialAllowed(req, pkg.filial)) {
    logAuditEvent({
      eventType: "access_denied",
      operation: pkg.operation,
      filial: pkg.filial,
      trackingNumber: pkg.trackingNumber,
      performedBy: (req as any).userFullName ?? null,
      details: `GET /packages/lookup`,
    });
    res.status(403).json({ error: `Acesso negado para a filial '${pkg.filial}'.` });
    return;
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const [scan] = await db
    .select()
    .from(scansTable)
    .where(
      and(
        eq(scansTable.trackingNumber, trackingNumber),
        eq(scansTable.operation, pkg.operation),
        eq(scansTable.scanDate, today),
      )
    )
    .limit(1);

  res.json({
    id: pkg.id,
    trackingNumber: pkg.trackingNumber,
    city: pkg.city,
    promisedDeliveryDate: pkg.promisedDeliveryDate ?? null,
    operation: pkg.operation,
    createdAt: pkg.createdAt.toISOString(),
    scannedToday: !!scan,
    scannedAt: scan?.scannedAt.toISOString() ?? null,
    scannedBy: scan?.scannedBy ?? null,
  });
});

// DELETE /packages/clear — must come BEFORE /packages/:id
router.delete("/packages/clear", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  const date      = (req.query.date      as string | undefined)?.trim();
  const dateFrom  = (req.query.dateFrom  as string | undefined)?.trim();
  const dateTo    = (req.query.dateTo    as string | undefined)?.trim();
  const operation = (req.query.operation as string | undefined)?.trim();

  if (!operation) {
    res.status(400).json({ error: "Parâmetro 'operation' é obrigatório para limpar pacotes." });
    return;
  }

  const conditions = [];

  // Single date shortcut (kept for backwards compat)
  if (date) {
    const start = new Date(`${date}T00:00:00-03:00`);
    const end   = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    conditions.push(gte(packagesTable.createdAt, start));
    conditions.push(lt(packagesTable.createdAt, end));
  } else {
    if (dateFrom) {
      conditions.push(gte(packagesTable.createdAt, new Date(`${dateFrom}T00:00:00-03:00`)));
    }
    if (dateTo) {
      const end = new Date(`${dateTo}T00:00:00-03:00`);
      end.setUTCDate(end.getUTCDate() + 1);
      conditions.push(lt(packagesTable.createdAt, end));
    }
  }

  if (operation) {
    conditions.push(eq(packagesTable.operation, operation));
  }

  const deleted = await db
    .delete(packagesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .returning({ id: packagesTable.id });

  res.json({ deleted: deleted.length });
});

router.get("/packages", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  const parsed = ListPackagesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const operation = parsed.data.operation ?? "LOGGI";
  let query = db.select().from(packagesTable).$dynamic();
  const conditions: ReturnType<typeof eq>[] = [];

  conditions.push(eq(packagesTable.operation, operation));

  // Restrição por filial dentro da AMAZON (plano de filiais): mesma
  // semântica null-safe já usada para operação em audit-events — quem tem
  // allowedFiliais restrito só vê pacotes da própria filial, ou sem filial
  // definida (LOGGI, ou cidade ainda não vinculada a nenhuma filial).
  const allowedFiliais = getAllowedFiliais(req);
  if (allowedFiliais !== null) {
    conditions.push(
      or(isNull(packagesTable.filial), inArray(packagesTable.filial, allowedFiliais)) as unknown as SQL
    );
  }

  // Date range filter (Brazil timezone — UTC-3, no DST)
  const dateFrom = (req.query as any).dateFrom as string | undefined;
  const dateTo   = (req.query as any).dateTo   as string | undefined;
  if (dateFrom) {
    conditions.push(gte(packagesTable.createdAt, new Date(`${dateFrom}T00:00:00-03:00`)) as any);
  }
  if (dateTo) {
    const end = new Date(`${dateTo}T00:00:00-03:00`);
    end.setUTCDate(end.getUTCDate() + 1);
    conditions.push(lt(packagesTable.createdAt, end) as any);
  }

  const citiesParam = (req.query as any).cities as string | undefined;
  if (citiesParam) {
    const cityList = citiesParam.split(",").map((c: string) => c.trim().toLowerCase()).filter(Boolean);
    if (cityList.length > 0) {
      conditions.push(
        inArray(sql`lower(${packagesTable.city})`, cityList) as unknown as SQL
      );
    }
  } else if (parsed.data.city) {
    conditions.push(
      sql`lower(${packagesTable.city}) = lower(${parsed.data.city})` as unknown as SQL
    );
  }

  // Filtro por rota (bairro) dentro da filial — usado pelo Pré-Sorter quando
  // a filial exige seleção manual de bairro (hoje: Vitória da Conquista).
  if (parsed.data.rota) {
    conditions.push(eq(packagesTable.rota, parsed.data.rota));
  }

  query = query.where(and(...conditions));
  const packages = await query.orderBy(packagesTable.createdAt);
  res.json(
    packages.map((p) => ({
      id: p.id,
      trackingNumber: p.trackingNumber,
      city: p.city,
      promisedDeliveryDate: p.promisedDeliveryDate,
      operation: p.operation,
      filial: p.filial,
      cep: p.cep ?? undefined,
      rota: p.rota ?? undefined,
      createdAt: p.createdAt.toISOString(),
    }))
  );
});

router.post("/packages", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  const parsed = CreatePackageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const operation = parsed.data.operation ?? "LOGGI";

  // Código TBR é obrigatório só na AMAZON — LOGGI continua sem formato exigido.
  let trackingNumber = parsed.data.trackingNumber;
  if (operation === "AMAZON") {
    const tbr = validateTbrFormat(trackingNumber);
    if (!tbr.valid) {
      res.status(400).json({ error: tbrValidationMessage(tbr.reason) });
      return;
    }
    trackingNumber = tbr.normalized;
  }

  const existing = await db
    .select()
    .from(packagesTable)
    .where(and(
      eq(packagesTable.trackingNumber, trackingNumber),
      eq(packagesTable.operation, operation),
    ));

  if (existing.length > 0) {
    res.status(409).json({ error: "Número de rastreio já cadastrado nesta operação" });
    return;
  }

  // Plano de filiais: a filial nunca é digitada — é derivada sozinha da
  // cidade. Só a AMAZON usa isso; LOGGI grava sempre null.
  const filial = operation === "AMAZON" ? await resolveFilialForCity(parsed.data.city) : null;
  if (!canCreateWithFilial(req, operation, filial)) {
    logAuditEvent({
      eventType: "access_denied",
      operation,
      filial,
      trackingNumber,
      performedBy: (req as any).userFullName ?? null,
      details: "POST /packages",
    });
    res.status(403).json({
      error: filial
        ? `Acesso negado para a filial '${filial}'.`
        : "Esta cidade ainda não está vinculada a nenhuma filial permitida para você. Peça para o administrador cadastrar a cidade na filial correta.",
    });
    return;
  }

  // Rota dentro da filial (ver plano-implementacao-filiais-amazon.md, seção
  // Vitória da Conquista) — mesmo espírito de filial: nunca digitada,
  // derivada sozinha do CEP quando ele vier na importação. Ausência de CEP
  // ou CEP não mapeado não bloqueia o cadastro, só deixa rota nula.
  const rota = filial ? await resolveRotaForCep(parsed.data.cep) : null;

  const [pkg] = await db
    .insert(packagesTable)
    .values({
      trackingNumber,
      city: parsed.data.city,
      cep: parsed.data.cep ?? null,
      promisedDeliveryDate: parsed.data.promisedDeliveryDate,
      operation,
      filial,
      rota,
    })
    .returning();

  logAuditEvent({
    eventType: "package_created",
    operation: pkg.operation,
    filial: pkg.filial,
    trackingNumber: pkg.trackingNumber,
    recordId: pkg.id,
    performedBy: (req as any).userFullName ?? null,
  });

  res.status(201).json({
    id: pkg.id,
    trackingNumber: pkg.trackingNumber,
    city: pkg.city,
    cep: pkg.cep ?? undefined,
    rota: pkg.rota ?? undefined,
    promisedDeliveryDate: pkg.promisedDeliveryDate,
    operation: pkg.operation,
    filial: pkg.filial,
    createdAt: pkg.createdAt.toISOString(),
  });
});

router.post("/packages/bulk", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  const parsed = BulkCreatePackagesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Top-level operation override (all packages in the bulk use the same operation).
  // requireOperationAccess above already checked this against the caller's
  // permission — but each item CAN override it individually (pkg.operation),
  // so that override is checked per-item below too, not just at the top level.
  const bulkOperation = (req.body?.operation as string | undefined) ?? "LOGGI";

  let imported = 0;
  let skipped = 0;
  let denied = 0;
  const errors: string[] = [];

  for (const pkg of parsed.data.packages) {
    try {
      const pkgOperation = pkg.operation ?? bulkOperation;
      if (!isOperationAllowed(req, pkgOperation)) {
        errors.push(`${pkg.trackingNumber}: sem permissão para a operação '${pkgOperation}'`);
        denied++;
        continue;
      }

      // Código TBR é obrigatório só na AMAZON — LOGGI continua sem formato exigido.
      let trackingNumber = pkg.trackingNumber;
      if (pkgOperation === "AMAZON") {
        const tbr = validateTbrFormat(trackingNumber);
        if (!tbr.valid) {
          errors.push(`${pkg.trackingNumber}: ${tbrValidationMessage(tbr.reason)}`);
          continue;
        }
        trackingNumber = tbr.normalized;
      }

      const existing = await db
        .select()
        .from(packagesTable)
        .where(and(
          eq(packagesTable.trackingNumber, trackingNumber),
          eq(packagesTable.operation, pkgOperation),
        ));

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const pkgFilial = pkgOperation === "AMAZON" ? await resolveFilialForCity(pkg.city) : null;
      if (!canCreateWithFilial(req, pkgOperation, pkgFilial)) {
        errors.push(
          pkgFilial
            ? `${pkg.trackingNumber}: sem permissão para a filial '${pkgFilial}'`
            : `${pkg.trackingNumber}: cidade '${pkg.city}' ainda não vinculada a nenhuma filial permitida`,
        );
        denied++;
        continue;
      }

      const pkgRota = pkgFilial ? await resolveRotaForCep(pkg.cep) : null;

      await db.insert(packagesTable).values({
        trackingNumber,
        city: pkg.city,
        cep: pkg.cep ?? null,
        promisedDeliveryDate: pkg.promisedDeliveryDate,
        operation: pkgOperation,
        filial: pkgFilial,
        rota: pkgRota,
      });
      imported++;
    } catch {
      errors.push(`Erro ao importar ${pkg.trackingNumber}`);
    }
  }

  const bulkUserFullName = (req as any).userFullName ?? null;
  if (imported > 0) {
    logAuditEvent({
      eventType: "package_created",
      operation: bulkOperation,
      performedBy: bulkUserFullName,
      details: `${imported} pacote(s) importado(s) em lote (${skipped} ignorado(s))`,
    });
  }
  if (denied > 0) {
    logAuditEvent({
      eventType: "access_denied",
      operation: bulkOperation,
      performedBy: bulkUserFullName,
      details: `POST /packages/bulk — ${denied} item(ns) negado(s) por permissão de operação`,
    });
  }

  res.status(201).json({ imported, skipped, errors });
});

router.delete("/packages/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeletePackageParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Não há parâmetro de operação nesta rota — busca o pacote primeiro para
  // saber a qual operação ele pertence antes de decidir se pode apagar.
  const [existing] = await db
    .select()
    .from(packagesTable)
    .where(eq(packagesTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Pacote não encontrado" });
    return;
  }

  if (!isOperationAllowed(req, existing.operation)) {
    logAuditEvent({
      eventType: "access_denied",
      operation: existing.operation,
      trackingNumber: existing.trackingNumber,
      recordId: existing.id,
      performedBy: (req as any).userFullName ?? null,
      details: `DELETE /packages/${params.data.id}`,
    });
    res.status(403).json({ error: `Acesso negado para a operação '${existing.operation}'.` });
    return;
  }

  if (!isFilialAllowed(req, existing.filial)) {
    logAuditEvent({
      eventType: "access_denied",
      operation: existing.operation,
      filial: existing.filial,
      trackingNumber: existing.trackingNumber,
      recordId: existing.id,
      performedBy: (req as any).userFullName ?? null,
      details: `DELETE /packages/${params.data.id}`,
    });
    res.status(403).json({ error: `Acesso negado para a filial '${existing.filial}'.` });
    return;
  }

  await db.delete(packagesTable).where(eq(packagesTable.id, params.data.id));

  logAuditEvent({
    eventType: "package_deleted",
    operation: existing.operation,
    filial: existing.filial,
    trackingNumber: existing.trackingNumber,
    recordId: existing.id,
    performedBy: (req as any).userFullName ?? null,
  });

  res.sendStatus(204);
});

router.get("/cities", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  const operation = (req.query.operation as string | undefined)?.trim() ?? "LOGGI";
  const conditions = [eq(packagesTable.operation, operation)];

  // Mesma restrição por filial da listagem de pacotes — senão o filtro de
  // cidade da tela de Cadastro revelaria cidades de outras filiais.
  const allowedFiliais = getAllowedFiliais(req);
  if (allowedFiliais !== null) {
    conditions.push(
      or(isNull(packagesTable.filial), inArray(packagesTable.filial, allowedFiliais)) as unknown as ReturnType<typeof eq>
    );
  }

  const rows = await db
    .selectDistinct({ city: packagesTable.city })
    .from(packagesTable)
    .where(and(...conditions))
    .orderBy(packagesTable.city);
  res.json(rows.map((r) => r.city));
});

// GET /filial-routes?filial=VCA (ou ?city=Vitória da Conquista) — rotas
// (bairros) ativas cadastradas para uma filial, para o seletor manual do
// Pré-Sorter (ver plano: cidade de Vitória da Conquista exige escolher o
// bairro antes de bipar). O Pré-Sorter só conhece a cidade selecionada, não
// o código da filial (isso é sempre resolvido no servidor, nunca hardcoded
// no frontend) — por isso aceita `city` e resolve pra filial internamente,
// igual ao cadastro de pacote. Filial sem rotas cadastradas (ou cidade sem
// filial) devolve lista vazia — a tela trata isso como "não exige seleção
// de bairro", sem tratamento especial pra nenhuma cidade.
router.get("/filial-routes", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  let filial = (req.query.filial as string | undefined)?.trim() || null;
  const city = (req.query.city as string | undefined)?.trim();

  if (!filial && city) {
    filial = await resolveFilialForCity(city);
  }

  if (!filial) {
    res.json([]);
    return;
  }

  if (!isFilialAllowed(req, filial)) {
    res.status(403).json({ error: `Acesso negado para a filial '${filial}'.` });
    return;
  }

  const routes = await getActiveRoutesForFilial(filial);
  res.json(routes);
});

export default router;
