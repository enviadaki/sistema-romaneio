import { pgTable, text, serial, timestamp, uniqueIndex, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { scanSessionsTable } from "./scan-sessions";

export const scansTable = pgTable(
  "scans",
  {
    id: serial("id").primaryKey(),
    trackingNumber: text("tracking_number").notNull(),
    city: text("city").notNull(),
    scanDate: text("scan_date").notNull(),
    scannedBy: text("scanned_by"),
    operation: text("operation").notNull().default("LOGGI"),
    // Opcional: nenhuma bipagem hoje se refere a uma sessão (Passo 3 é só
    // schema). Fica pronto para o Passo 4 vincular as bipagens da AMAZON a
    // um lote, sem exigir nada da LOGGI.
    sessionId: integer("session_id").references(() => scanSessionsTable.id, {
      onDelete: "set null",
    }),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("scans_tracking_number_scan_date_operation_unique").on(
      table.trackingNumber,
      table.scanDate,
      table.operation,
    ),
  ],
);

export const insertScanSchema = createInsertSchema(scansTable).omit({
  id: true,
  scannedAt: true,
});
export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scansTable.$inferSelect;
