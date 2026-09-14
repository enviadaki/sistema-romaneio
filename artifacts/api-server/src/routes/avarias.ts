import { Router, type IRouter } from "express";
import { eq, and, desc, ilike, sql, type SQL } from "drizzle-orm";
import { db, avariasTable, avariaCategories, type AvariaCategory } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOperationAccess } from "../middlewares/requireOperationAccess";
import { normalizeTbrCode } from "../modules/amazon/tbr";
import { logAuditEvent } from "../modules/audit/log";

// Passo 6 do plano da AMAZON: registro manual de avaria — ação separada da
// bipagem normal, não altera o status do pacote original. Decisões do
// usuário: campos extras = categoria + descrição + foto; permite registrar
// mesmo se o código não estiver cadastrado (não bloqueia).
const router: IRouter = Router();

function isValidCategory(value: unknown): value is AvariaCategory {
  return typeof value === "string" && (avariaCategories as readonly string[]).includes(value);
}

// Limite de tamanho pra foto em base64 — sem storage de arquivo de verdade
// neste projeto, a imagem já vem comprimida do navegador; isso é só uma
// trava de sanidade contra um payload gigante por engano.
const MAX_PHOTO_BASE64_LENGTH = 2_000_000; // ~1.5MB de imagem original

router.post("/avarias", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  const operation = (req.body?.operation as string | undefined)?.trim() || "LOGGI";
  // Mesma normalização usada em /scans e /packages para AMAZON (maiúsculas,
  // sem espaços) — sem isso, um código digitado em caixa diferente da
  // registrada no cadastro do pacote não bate na comparação exata usada
  // pelo /stats para tirar o pacote da lista de pendentes.
  let trackingNumber = (req.body?.trackingNumber as string | undefined)?.trim();
  if (operation === "AMAZON" && trackingNumber) {
    trackingNumber = normalizeTbrCode(trackingNumber);
  }
  const category = req.body?.category;
  const description = (req.body?.description as string | undefined)?.trim() || null;
  const photo = (req.body?.photo as string | undefined) || null;
  const confirm = req.body?.confirm === true;
  const sessionIdRaw = req.body?.sessionId;
  const sessionId =
    typeof sessionIdRaw === "number" && Number.isFinite(sessionIdRaw) ? sessionIdRaw : null;

  if (!trackingNumber) {
    res.status(400).json({ error: "trackingNumber é obrigatório" });
    return;
  }
  if (!isValidCategory(category)) {
    res.status(400).json({ error: `category inválida. Use uma de: ${avariaCategories.join(", ")}` });
    return;
  }
  if (photo && photo.length > MAX_PHOTO_BASE64_LENGTH) {
    res.status(400).json({ error: "Foto muito grande. Tente novamente com uma imagem menor." });
    return;
  }

  // "Avisa se já existir avaria para aquele código" — não bloqueia, só avisa
  // (a menos que o operador já tenha confirmado que quer registrar mesmo
  // assim, via confirm=true).
  if (!confirm) {
    const [existing] = await db
      .select()
      .from(avariasTable)
      .where(and(eq(avariasTable.trackingNumber, trackingNumber), eq(avariasTable.operation, operation)))
      .orderBy(desc(avariasTable.createdAt))
      .limit(1);

    if (existing) {
      res.status(409).json({
        error: "Já existe uma avaria registrada para este código",
        existing: {
          category: existing.category,
          createdAt: existing.createdAt.toISOString(),
          registeredBy: existing.registeredBy,
        },
      });
      return;
    }
  }

  const userFullName = (req as any).userFullName ?? null;

  const [created] = await db
    .insert(avariasTable)
    .values({
      trackingNumber,
      operation,
      sessionId,
      category,
      description,
      photo,
      registeredBy: userFullName,
    })
    .returning();

  logAuditEvent({
    eventType: "avaria_registrada",
    operation: created.operation,
    trackingNumber: created.trackingNumber,
    sessionId: created.sessionId ?? null,
    recordId: created.id,
    performedBy: userFullName,
    details: created.category,
  });

  res.status(201).json({
    id: created.id,
    trackingNumber: created.trackingNumber,
    operation: created.operation,
    category: created.category,
    description: created.description,
    hasPhoto: !!created.photo,
    status: created.status,
    registeredBy: created.registeredBy,
    createdAt: created.createdAt.toISOString(),
  });
});

// GET /avarias?operation=Y[&trackingNumber=&registeredBy=&sessionId=&status=&dateFrom=&dateTo=]
// Lista enxuta (sem foto/descrição) — usada em dois lugares:
// 1) Pré-Sorter, sem filtros extras, só pra tirar da "Faltantes
//    (Esperados)" qualquer código que já tenha avaria registrada;
// 2) Passo 7 (histórico/consulta de avarias), com os filtros combinados
//    (período, código, usuário, sessão, situação) — mesmos nomes de
//    parâmetro que /historico já usa pra scans, pra manter familiaridade.
router.get("/avarias", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  const operation = (req.query.operation as string | undefined)?.trim() || "LOGGI";
  const trackingNumber = (req.query.trackingNumber as string | undefined)?.trim();
  const registeredBy = (req.query.registeredBy as string | undefined)?.trim();
  const status = (req.query.status as string | undefined)?.trim();
  const dateFrom = (req.query.dateFrom as string | undefined)?.trim();
  const dateTo = (req.query.dateTo as string | undefined)?.trim();
  const sessionIdRaw = req.query.sessionId as string | undefined;
  const sessionId = sessionIdRaw ? parseInt(sessionIdRaw, 10) : NaN;

  const conditions: SQL[] = [eq(avariasTable.operation, operation)];
  if (trackingNumber) conditions.push(ilike(avariasTable.trackingNumber, `%${trackingNumber}%`));
  if (registeredBy) conditions.push(eq(avariasTable.registeredBy, registeredBy));
  if (status) conditions.push(eq(avariasTable.status, status));
  if (!Number.isNaN(sessionId)) conditions.push(eq(avariasTable.sessionId, sessionId));
  // Período comparado pelo dia local (America/Sao_Paulo), igual ao resto
  // do sistema (ex: scanDate em /scans), já que createdAt é timestamptz.
  if (dateFrom) {
    conditions.push(
      sql`(${avariasTable.createdAt} AT TIME ZONE 'America/Sao_Paulo')::date >= ${dateFrom}::date`,
    );
  }
  if (dateTo) {
    conditions.push(
      sql`(${avariasTable.createdAt} AT TIME ZONE 'America/Sao_Paulo')::date <= ${dateTo}::date`,
    );
  }

  const rows = await db
    .select({
      id: avariasTable.id,
      trackingNumber: avariasTable.trackingNumber,
      category: avariasTable.category,
      sessionId: avariasTable.sessionId,
      status: avariasTable.status,
      registeredBy: avariasTable.registeredBy,
      hasPhoto: sql<boolean>`(${avariasTable.photo} is not null)`,
      createdAt: avariasTable.createdAt,
    })
    .from(avariasTable)
    .where(and(...conditions))
    .orderBy(desc(avariasTable.createdAt));

  res.json(
    rows.map((r) => ({
      id: r.id,
      trackingNumber: r.trackingNumber,
      category: r.category,
      sessionId: r.sessionId,
      status: r.status,
      registeredBy: r.registeredBy,
      hasPhoto: r.hasPhoto,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

// GET /avarias/:id?operation=Y — detalhe completo de uma avaria (com foto e
// descrição), usado no dialog de detalhe do histórico. Não vem na lista
// pra não pesar o payload com fotos em base64.
router.get("/avarias/:id", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  const operation = (req.query.operation as string | undefined)?.trim() || "LOGGI";
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "id inválido" });
    return;
  }

  const [row] = await db
    .select()
    .from(avariasTable)
    .where(and(eq(avariasTable.id, id), eq(avariasTable.operation, operation)));

  if (!row) {
    res.status(404).json({ error: "Avaria não encontrada" });
    return;
  }

  res.json({
    id: row.id,
    trackingNumber: row.trackingNumber,
    operation: row.operation,
    sessionId: row.sessionId,
    category: row.category,
    description: row.description,
    photo: row.photo,
    status: row.status,
    registeredBy: row.registeredBy,
    createdAt: row.createdAt.toISOString(),
  });
});

export default router;
