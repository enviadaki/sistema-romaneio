import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Passo 12 do plano da AMAZON: log de eventos consolidado. Cada tabela
// (scans, scan_events, avarias, scan_sessions, delivery_manifests...) já
// guarda seu próprio histórico, mas espalhado — essa tabela reúne os
// eventos mais relevantes pra auditoria num só lugar, consultável e
// filtrável, independente de qual tabela originou o evento. Gravar aqui é
// sempre "melhor esforço" (ver modules/audit/log.ts): uma falha ao
// registrar o log nunca pode derrubar a ação original que está sendo
// auditada.
export const auditEventTypes = [
  "scan_accepted",
  "scan_bulk_accepted",
  "avaria_registrada",
  "session_opened",
  "session_closed",
  "package_created",
  "package_deleted",
  "manifest_created",
  "manifest_status_changed",
  "manifest_deleted",
  "access_denied",
  "operator_login",
] as const;
export type AuditEventType = (typeof auditEventTypes)[number];

export const auditEventsTable = pgTable("audit_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  // null quando o evento não é específico de uma operação (ex: romaneio
  // motorista, login) — nem todo evento auditável tem LOGGI/AMAZON.
  operation: text("operation"),
  // Filial dentro da AMAZON (ver plano-implementacao-filiais-amazon). Null
  // para LOGGI e para qualquer evento sem filial associada — mesma
  // semântica null-safe já usada para `operation` acima.
  filial: text("filial"),
  trackingNumber: text("tracking_number"),
  sessionId: integer("session_id"),
  // id do registro afetado (pacote, avaria, romaneio motorista...), quando
  // fizer sentido — sem FK de verdade porque aponta pra tabelas diferentes
  // dependendo do eventType, igual ao "empresa" de romaneio motorista não
  // ser uma FK.
  recordId: integer("record_id"),
  performedBy: text("performed_by"),
  // texto livre com contexto adicional (ex: rota/método negado, número do
  // romaneio, novo status)
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAuditEventSchema = createInsertSchema(auditEventsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAuditEvent = z.infer<typeof insertAuditEventSchema>;
export type AuditEvent = typeof auditEventsTable.$inferSelect;
