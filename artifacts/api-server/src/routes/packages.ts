import { Router, type IRouter } from "express";
import { eq, inArray, sql, and, gte, lt, SQL } from "drizzle-orm";
import { db, packagesTable, scansTable } from "@workspace/db";
import {
  CreatePackageBody,
  BulkCreatePackagesBody,
  DeletePackageParams,
  ListPackagesQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOperationAccess, isOperationAllowed } from "../middlewares/requireOperationAccess";
import { validateTbrFormat, tbrValidationMessage, normalizeTbrCode } from "../modules/amazon/tbr";

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

  query = query.where(and(...conditions));
  const packages = await query.orderBy(packagesTable.createdAt);
  res.json(
    packages.map((p) => ({
      id: p.id,
      trackingNumber: p.trackingNumber,
      city: p.city,
      promisedDeliveryDate: p.promisedDeliveryDate,
      operation: p.operation,
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

  const [pkg] = await db
    .insert(packagesTable)
    .values({
      trackingNumber,
      city: parsed.data.city,
      promisedDeliveryDate: parsed.data.promisedDeliveryDate,
      operation,
    })
    .returning();

  res.status(201).json({
    id: pkg.id,
    trackingNumber: pkg.trackingNumber,
    city: pkg.city,
    promisedDeliveryDate: pkg.promisedDeliveryDate,
    operation: pkg.operation,
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
  const errors: string[] = [];

  for (const pkg of parsed.data.packages) {
    try {
      const pkgOperation = pkg.operation ?? bulkOperation;
      if (!isOperationAllowed(req, pkgOperation)) {
        errors.push(`${pkg.trackingNumber}: sem permissão para a operação '${pkgOperation}'`);
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

      await db.insert(packagesTable).values({
        trackingNumber,
        city: pkg.city,
        promisedDeliveryDate: pkg.promisedDeliveryDate,
        operation: pkgOperation,
      });
      imported++;
    } catch {
      errors.push(`Erro ao importar ${pkg.trackingNumber}`);
    }
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
    res.status(403).json({ error: `Acesso negado para a operação '${existing.operation}'.` });
    return;
  }

  await db.delete(packagesTable).where(eq(packagesTable.id, params.data.id));

  res.sendStatus(204);
});

router.get("/cities", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  const operation = (req.query.operation as string | undefined)?.trim() ?? "LOGGI";
  const rows = await db
    .selectDistinct({ city: packagesTable.city })
    .from(packagesTable)
    .where(eq(packagesTable.operation, operation))
    .orderBy(packagesTable.city);
  res.json(rows.map((r) => r.city));
});

export default router;
