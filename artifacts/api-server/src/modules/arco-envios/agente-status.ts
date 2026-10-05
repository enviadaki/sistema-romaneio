import { eq } from "drizzle-orm";
import { db, arcoAgenteStatusTable } from "@workspace/db";

const AGENTE_STATUS_ROW_ID = 1;
export const AGENTE_ONLINE_THRESHOLD_MS = 60_000;

// Linha única atualizada a cada chamada autenticada do agente (ver
// requireAgenteToken.ts) — "melhor esforço", igual a logAuditEvent: nunca
// espera nem propaga erro pro chamador.
export function touchAgenteStatus(): void {
  db.insert(arcoAgenteStatusTable)
    .values({ id: AGENTE_STATUS_ROW_ID, ultimoVistoEm: new Date() })
    .onConflictDoUpdate({
      target: arcoAgenteStatusTable.id,
      set: { ultimoVistoEm: new Date() },
    })
    .catch((err: unknown) => {
      console.error("[arco-agente] falha ao registrar presença do agente:", err);
    });
}

export async function getAgenteStatus(): Promise<{ online: boolean; ultimoVistoEm: Date | null }> {
  const [row] = await db
    .select()
    .from(arcoAgenteStatusTable)
    .where(eq(arcoAgenteStatusTable.id, AGENTE_STATUS_ROW_ID))
    .limit(1);

  if (!row) return { online: false, ultimoVistoEm: null };

  const online = Date.now() - row.ultimoVistoEm.getTime() < AGENTE_ONLINE_THRESHOLD_MS;
  return { online, ultimoVistoEm: row.ultimoVistoEm };
}
