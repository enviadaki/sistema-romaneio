import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, scanEventsTable, scanEventTypes, type ScanEventType } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOperationAccess } from "../middlewares/requireOperationAccess";

// Complemento ao Passo 4b: registra e lista as ocorrências de duplicado /
// não encontrado / fora do padrão dentro de uma sessão de bipagem, pra dar
// uma relação consultável (não só o contador).
const router: IRouter = Router();

function isValidEventType(value: unknown): value is ScanEventType {
  return typeof value === "string" && (scanEventTypes as readonly string[]).includes(value);
}

// POST /scan-events — registra uma ocorrência. Chamado "fire and forget"
// pelo frontend a cada duplicidade / não encontrado / fora do padrão; nunca
// bloqueia a bipagem em si.
router.post("/scan-events", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  const operation = (req.body?.operation as string | undefined)?.trim() || "LOGGI";
  const trackingNumber = (req.body?.trackingNumber as string | undefined)?.trim();
  const eventType = req.body?.eventType;
  const sessionIdRaw = req.body?.sessionId;
  const sessionId =
    typeof sessionIdRaw === "number" && Number.isFinite(sessionIdRaw) ? sessionIdRaw : null;

  if (!trackingNumber) {
    res.status(400).json({ error: "trackingNumber é obrigatório" });
    return;
  }
  if (!isValidEventType(eventType)) {
    res.status(400).json({ error: `eventType inválido. Use um de: ${scanEventTypes.join(", ")}` });
    return;
  }

  const userFullName = (req as any).userFullName ?? null;

  const [created] = await db
    .insert(scanEventsTable)
    .values({ sessionId, operation, trackingNumber, eventType, scannedBy: userFullName })
    .returning();

  res.status(201).json(created);
});

// GET /scan-events?sessionId=X&operation=Y — relação de ocorrências daquela
// sessão, mais recentes primeiro.
router.get("/scan-events", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  const operation = (req.query.operation as string | undefined)?.trim() || "LOGGI";
  const sessionIdRaw = req.query.sessionId as string | undefined;
  const sessionId = sessionIdRaw ? parseInt(sessionIdRaw, 10) : NaN;

  if (Number.isNaN(sessionId)) {
    res.status(400).json({ error: "Parâmetro 'sessionId' é obrigatório e deve ser numérico." });
    return;
  }

  const events = await db
    .select()
    .from(scanEventsTable)
    .where(and(eq(scanEventsTable.sessionId, sessionId), eq(scanEventsTable.operation, operation)))
    .orderBy(desc(scanEventsTable.createdAt));

  res.json(events);
});

export default router;
