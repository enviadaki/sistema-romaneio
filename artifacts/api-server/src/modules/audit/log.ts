import { db, auditEventsTable, type AuditEventType } from "@workspace/db";

// Passo 12 do plano da AMAZON: log de auditoria consolidado. Mesma filosofia
// já usada pro registro de scan_events (Passo 4b/relação de ocorrências) —
// "melhor esforço": nunca espera (await) nem propaga erro pro chamador, pra
// nunca derrubar a ação de verdade (bipar, registrar avaria, abrir sessão...)
// por causa de uma falha ao gravar o log.
export function logAuditEvent(event: {
  eventType: AuditEventType;
  operation?: string | null;
  filial?: string | null;
  trackingNumber?: string | null;
  sessionId?: number | null;
  recordId?: number | null;
  performedBy?: string | null;
  details?: string | null;
}): void {
  db.insert(auditEventsTable)
    .values({
      eventType: event.eventType,
      operation: event.operation ?? null,
      filial: event.filial ?? null,
      trackingNumber: event.trackingNumber ?? null,
      sessionId: event.sessionId ?? null,
      recordId: event.recordId ?? null,
      performedBy: event.performedBy ?? null,
      details: event.details ?? null,
    })
    .catch((err: unknown) => {
      console.error("[audit] falha ao registrar evento de auditoria:", err);
    });
}
