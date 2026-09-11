import { Router, type IRouter } from "express";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import {
  db,
  scanSessionsTable,
  scansTable,
  scanEventsTable,
  avariasTable,
  packagesTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOperationAccess, isOperationAllowed } from "../middlewares/requireOperationAccess";

// Passo 4a do plano da AMAZON: abrir/fechar sessão de bipagem (lote). Sem
// indicadores em tempo real ainda (isso é o Passo 4b) — aqui é só o
// controle de quem abriu, quando, e quando foi encerrada.
const router: IRouter = Router();

// GET /scan-sessions/current?operation=AMAZON — sessão aberta atual daquela
// operação, ou null. Usado pra restaurar o estado se a página recarregar.
router.get("/scan-sessions/current", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  const operation = (req.query.operation as string | undefined)?.trim() || "LOGGI";

  const [session] = await db
    .select()
    .from(scanSessionsTable)
    .where(and(eq(scanSessionsTable.operation, operation), eq(scanSessionsTable.status, "open")))
    .orderBy(desc(scanSessionsTable.openedAt))
    .limit(1);

  res.json(session ?? null);
});

// POST /scan-sessions — abre uma sessão nova. Se já existir uma aberta para
// a mesma operação, devolve essa mesma (idempotente — evita duas sessões
// abertas ao mesmo tempo e não quebra se o operador atualizar a página).
router.post("/scan-sessions", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  const operation = (req.body?.operation as string | undefined)?.trim() || "LOGGI";
  const userFullName = (req as any).userFullName ?? null;

  const [existing] = await db
    .select()
    .from(scanSessionsTable)
    .where(and(eq(scanSessionsTable.operation, operation), eq(scanSessionsTable.status, "open")))
    .orderBy(desc(scanSessionsTable.openedAt))
    .limit(1);

  if (existing) {
    res.json(existing);
    return;
  }

  const [created] = await db
    .insert(scanSessionsTable)
    .values({ operation, status: "open", openedBy: userFullName })
    .returning();

  res.status(201).json(created);
});

// PATCH /scan-sessions/:id/close — encerra a sessão. A operação alvo não vem
// de query/body (vem do próprio registro), então checa a permissão na mão
// depois de buscar a sessão — mesmo padrão do DELETE /packages/:id.
router.patch("/scan-sessions/:id/close", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "id inválido" });
    return;
  }

  const [session] = await db.select().from(scanSessionsTable).where(eq(scanSessionsTable.id, id));
  if (!session) {
    res.status(404).json({ error: "Sessão não encontrada" });
    return;
  }

  if (!isOperationAllowed(req, session.operation)) {
    res.status(403).json({ error: `Acesso negado para a operação '${session.operation}'.` });
    return;
  }

  if (session.status === "closed") {
    res.status(409).json({ error: "Sessão já encerrada" });
    return;
  }

  const userFullName = (req as any).userFullName ?? null;

  const [updated] = await db
    .update(scanSessionsTable)
    .set({ status: "closed", closedBy: userFullName, closedAt: new Date() })
    .where(eq(scanSessionsTable.id, id))
    .returning();

  res.json(updated);
});

// GET /scan-sessions/:id/summary?operation=Y — resumo da sessão (Passo 8):
// total processado, aceito, rejeições por tipo e avarias registradas
// naquela sessão, calculados a partir do banco (não do contador ao vivo
// do navegador, que zera se a página recarregar) — funciona tanto pra
// sessão aberta quanto já encerrada, então dá pra conferir a qualquer
// momento, não só no instante do encerramento.
router.get("/scan-sessions/:id/summary", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "id inválido" });
    return;
  }

  const [session] = await db.select().from(scanSessionsTable).where(eq(scanSessionsTable.id, id));
  if (!session) {
    res.status(404).json({ error: "Sessão não encontrada" });
    return;
  }
  if (!isOperationAllowed(req, session.operation)) {
    res.status(403).json({ error: `Acesso negado para a operação '${session.operation}'.` });
    return;
  }

  const [acceptedResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(scansTable)
    .where(eq(scansTable.sessionId, id));

  const eventRows = await db
    .select({ eventType: scanEventsTable.eventType, count: sql<number>`count(*)::int` })
    .from(scanEventsTable)
    .where(eq(scanEventsTable.sessionId, id))
    .groupBy(scanEventsTable.eventType);

  const eventCounts: Record<string, number> = { duplicate: 0, not_found: 0, invalid_format: 0, other_error: 0 };
  for (const row of eventRows) eventCounts[row.eventType] = row.count;

  const [avariasResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(avariasTable)
    .where(eq(avariasTable.sessionId, id));

  // Pendências: não são específicas desta sessão (a sessão não é presa a
  // uma rota/cidade só) — é o total de "faltam bipar" da operação inteira
  // no momento da consulta, mesmo cálculo do card do Dashboard (exclui
  // quem já foi bipado ou já tem avaria).
  const [pendingResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(packagesTable)
    .leftJoin(
      scansTable,
      and(
        eq(scansTable.trackingNumber, packagesTable.trackingNumber),
        eq(scansTable.operation, packagesTable.operation),
      ),
    )
    .leftJoin(
      avariasTable,
      and(
        eq(avariasTable.trackingNumber, packagesTable.trackingNumber),
        eq(avariasTable.operation, packagesTable.operation),
      ),
    )
    .where(
      and(
        eq(packagesTable.operation, session.operation),
        isNull(scansTable.id),
        isNull(avariasTable.id),
      ),
    );

  const accepted = acceptedResult?.count ?? 0;
  const rejected = eventCounts.duplicate + eventCounts.not_found + eventCounts.invalid_format + eventCounts.other_error;

  res.json({
    session: {
      id: session.id,
      operation: session.operation,
      status: session.status,
      openedBy: session.openedBy,
      openedAt: session.openedAt.toISOString(),
      closedBy: session.closedBy,
      closedAt: session.closedAt ? session.closedAt.toISOString() : null,
    },
    totals: {
      total: accepted + rejected,
      accepted,
      duplicate: eventCounts.duplicate,
      notFound: eventCounts.not_found,
      invalidFormat: eventCounts.invalid_format,
      otherErrors: eventCounts.other_error,
    },
    avarias: avariasResult?.count ?? 0,
    pendingOperation: pendingResult?.count ?? 0,
  });
});

export default router;
