import { Router, type IRouter } from "express";
import { eq, and, or, isNull, inArray, ilike, desc, sql, type SQL } from "drizzle-orm";
import { db, auditEventsTable, auditEventTypes } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { getAllowedOperations } from "../middlewares/requireOperationAccess";

// Passo 12 do plano da AMAZON: consulta do log de auditoria consolidado.
// Sem requireOperationAccess aqui — nem todo evento tem uma operação (login,
// romaneio motorista), então a restrição por permissão é aplicada na mão:
// quem tem allowedOperations restrito só vê eventos sem operação definida
// (não é específico de LOGGI/AMAZON) ou das operações que tem acesso —
// nunca vê "acesso negado" ou eventos de uma operação que ele mesmo não
// pode acessar.
const router: IRouter = Router();

const MAX_RESULTS = 500;

router.get("/audit-events", requireAuth, async (req, res): Promise<void> => {
  const eventType = (req.query.eventType as string | undefined)?.trim();
  const operation = (req.query.operation as string | undefined)?.trim();
  const trackingNumber = (req.query.trackingNumber as string | undefined)?.trim();
  const performedBy = (req.query.performedBy as string | undefined)?.trim();
  const dateFrom = (req.query.dateFrom as string | undefined)?.trim();
  const dateTo = (req.query.dateTo as string | undefined)?.trim();
  const sessionIdRaw = req.query.sessionId as string | undefined;
  const sessionId = sessionIdRaw ? parseInt(sessionIdRaw, 10) : NaN;

  const conditions: SQL[] = [];
  if (eventType) conditions.push(eq(auditEventsTable.eventType, eventType));
  if (operation) conditions.push(eq(auditEventsTable.operation, operation));
  if (trackingNumber) conditions.push(ilike(auditEventsTable.trackingNumber, `%${trackingNumber}%`));
  if (performedBy) conditions.push(eq(auditEventsTable.performedBy, performedBy));
  if (!Number.isNaN(sessionId)) conditions.push(eq(auditEventsTable.sessionId, sessionId));
  // Período comparado pelo dia local (America/Sao_Paulo), mesmo padrão já
  // usado em /avarias e /historico.
  if (dateFrom) {
    conditions.push(
      sql`(${auditEventsTable.createdAt} AT TIME ZONE 'America/Sao_Paulo')::date >= ${dateFrom}::date`,
    );
  }
  if (dateTo) {
    conditions.push(
      sql`(${auditEventsTable.createdAt} AT TIME ZONE 'America/Sao_Paulo')::date <= ${dateTo}::date`,
    );
  }

  const allowed = getAllowedOperations(req);
  if (allowed !== null) {
    conditions.push(or(isNull(auditEventsTable.operation), inArray(auditEventsTable.operation, allowed))!);
  }

  const rows = await db
    .select()
    .from(auditEventsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditEventsTable.createdAt))
    .limit(MAX_RESULTS);

  res.json({
    events: rows.map((r) => ({
      id: r.id,
      eventType: r.eventType,
      operation: r.operation,
      trackingNumber: r.trackingNumber,
      sessionId: r.sessionId,
      recordId: r.recordId,
      performedBy: r.performedBy,
      details: r.details,
      createdAt: r.createdAt.toISOString(),
    })),
    truncated: rows.length === MAX_RESULTS,
  });
});

// GET /audit-events/types — lista fixa de tipos de evento, pro filtro do
// frontend não precisar duplicar essa lista.
router.get("/audit-events/types", requireAuth, async (_req, res): Promise<void> => {
  res.json(auditEventTypes);
});

export default router;
