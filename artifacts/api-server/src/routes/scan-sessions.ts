import { Router, type IRouter } from "express";
import { eq, and, desc, isNull, sql, type SQL } from "drizzle-orm";
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
import { isFilialAllowed, getAllowedFiliais } from "../middlewares/requireFilialAccess";
import { logAuditEvent } from "../modules/audit/log";

// Passo 4a do plano da AMAZON: abrir/fechar sessão de bipagem (lote). Sem
// indicadores em tempo real ainda (isso é o Passo 4b) — aqui é só o
// controle de quem abriu, quando, e quando foi encerrada.
const router: IRouter = Router();

// Compara a filial da sessão com um valor — trata null com IS NULL (drizzle
// `eq` não compara null corretamente em SQL). Plano de filiais: a "sessão
// aberta" passa a ser única por (operation, filial), não só por operation —
// senão duas filiais diferentes acabariam compartilhando a mesma sessão e
// os mesmos contadores em tempo real.
function filialEq(filial: string | null): SQL {
  return filial === null ? isNull(scanSessionsTable.filial) : eq(scanSessionsTable.filial, filial);
}

// Resolve qual filial a sessão deve usar, sem exigir que o frontend informe
// nada na maioria dos casos: se o operador só tem UMA filial permitida (o
// caso comum — cada conta nasce travada numa filial só, ver Passo 5 do
// plano), usa essa sozinho, exatamente como o frontend já faz para
// operação (layout.tsx: auto-seleciona quando allowedOperations.length===1).
// Um `filial` explícito na query/body (para um supervisor com mais de uma
// filial permitida, quando essa tela existir) sempre tem prioridade.
function resolveSessionFilial(
  req: any,
  explicit: string | null,
  operation: string,
): { ok: true; filial: string | null } | { ok: false; error: string } {
  if (explicit !== null) return { ok: true, filial: explicit };
  if (operation !== "AMAZON") return { ok: true, filial: null };

  const allowed = getAllowedFiliais(req);
  if (allowed === null) return { ok: true, filial: null };
  if (allowed.length === 1) return { ok: true, filial: allowed[0] };
  return { ok: false, error: "Selecione a filial para continuar — você tem acesso a mais de uma." };
}

// GET /scan-sessions/current?operation=AMAZON — sessão aberta atual daquela
// operação (+ filial, resolvida automaticamente — ver resolveSessionFilial),
// ou null. Usado pra restaurar o estado se a página recarregar.
router.get("/scan-sessions/current", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  const operation = (req.query.operation as string | undefined)?.trim() || "LOGGI";
  const explicitFilial = (req.query.filial as string | undefined)?.trim() || null;

  const resolution = resolveSessionFilial(req, explicitFilial, operation);
  if (!resolution.ok) {
    res.status(400).json({ error: resolution.error });
    return;
  }
  const filial = resolution.filial;

  if (!isFilialAllowed(req, filial)) {
    res.status(403).json({ error: `Acesso negado para a filial '${filial}'.` });
    return;
  }

  const [session] = await db
    .select()
    .from(scanSessionsTable)
    .where(and(eq(scanSessionsTable.operation, operation), filialEq(filial), eq(scanSessionsTable.status, "open")))
    .orderBy(desc(scanSessionsTable.openedAt))
    .limit(1);

  res.json(session ?? null);
});

// POST /scan-sessions — abre uma sessão nova. Se já existir uma aberta para
// a mesma operação+filial, devolve essa mesma (idempotente — evita duas
// sessões abertas ao mesmo tempo e não quebra se o operador atualizar a
// página). A filial vem sozinha de resolveSessionFilial na maioria dos
// casos — só quem tem mais de uma filial precisa informar explicitamente.
router.post("/scan-sessions", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  const operation = (req.body?.operation as string | undefined)?.trim() || "LOGGI";
  const explicitFilial = (req.body?.filial as string | undefined)?.trim() || null;
  const userFullName = (req as any).userFullName ?? null;

  const resolution = resolveSessionFilial(req, explicitFilial, operation);
  if (!resolution.ok) {
    res.status(400).json({ error: resolution.error });
    return;
  }
  const filial = resolution.filial;

  if (!isFilialAllowed(req, filial)) {
    logAuditEvent({
      eventType: "access_denied",
      operation,
      filial,
      performedBy: userFullName,
      details: "POST /scan-sessions",
    });
    res.status(403).json({ error: `Acesso negado para a filial '${filial}'.` });
    return;
  }

  const [existing] = await db
    .select()
    .from(scanSessionsTable)
    .where(and(eq(scanSessionsTable.operation, operation), filialEq(filial), eq(scanSessionsTable.status, "open")))
    .orderBy(desc(scanSessionsTable.openedAt))
    .limit(1);

  if (existing) {
    res.json(existing);
    return;
  }

  const [created] = await db
    .insert(scanSessionsTable)
    .values({ operation, filial, status: "open", openedBy: userFullName })
    .returning();

  logAuditEvent({
    eventType: "session_opened",
    operation: created.operation,
    filial: created.filial,
    sessionId: created.id,
    performedBy: userFullName,
  });

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
    logAuditEvent({
      eventType: "access_denied",
      operation: session.operation,
      sessionId: session.id,
      performedBy: (req as any).userFullName ?? null,
      details: `PATCH /scan-sessions/${id}/close`,
    });
    res.status(403).json({ error: `Acesso negado para a operação '${session.operation}'.` });
    return;
  }

  if (!isFilialAllowed(req, session.filial)) {
    logAuditEvent({
      eventType: "access_denied",
      operation: session.operation,
      filial: session.filial,
      sessionId: session.id,
      performedBy: (req as any).userFullName ?? null,
      details: `PATCH /scan-sessions/${id}/close`,
    });
    res.status(403).json({ error: `Acesso negado para a filial '${session.filial}'.` });
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

  logAuditEvent({
    eventType: "session_closed",
    operation: updated.operation,
    filial: updated.filial,
    sessionId: updated.id,
    performedBy: userFullName,
  });

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
  if (!isFilialAllowed(req, session.filial)) {
    res.status(403).json({ error: `Acesso negado para a filial '${session.filial}'.` });
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
        // Sessão de uma filial só conta pendências daquela filial — senão o
        // resumo misturaria "faltam bipar" de todas as filiais da AMAZON.
        session.filial === null ? undefined : eq(packagesTable.filial, session.filial),
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
