import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, scanSessionsTable } from "@workspace/db";
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

export default router;
