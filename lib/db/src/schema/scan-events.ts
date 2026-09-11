import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { scanSessionsTable } from "./scan-sessions";

// Complemento aos indicadores do Passo 4b: os contadores (duplicado, não
// encontrado, fora do padrão) já existiam só na memória do navegador — essa
// tabela guarda CADA ocorrência (código, quando, quem), pra dar uma relação
// consultável em vez de só o número. "accepted" não precisa de linha aqui:
// já fica registrado como bipagem de verdade em `scans`.
export const scanEventTypes = ["duplicate", "not_found", "invalid_format", "other_error"] as const;
export type ScanEventType = (typeof scanEventTypes)[number];

export const scanEventsTable = pgTable("scan_events", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => scanSessionsTable.id, { onDelete: "cascade" }),
  operation: text("operation").notNull().default("LOGGI"),
  trackingNumber: text("tracking_number").notNull(),
  eventType: text("event_type").notNull(),
  scannedBy: text("scanned_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertScanEventSchema = createInsertSchema(scanEventsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertScanEvent = z.infer<typeof insertScanEventSchema>;
export type ScanEvent = typeof scanEventsTable.$inferSelect;
