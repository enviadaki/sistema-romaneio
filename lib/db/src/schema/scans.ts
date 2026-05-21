import { pgTable, text, serial, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scansTable = pgTable(
  "scans",
  {
    id: serial("id").primaryKey(),
    trackingNumber: text("tracking_number").notNull(),
    city: text("city").notNull(),
    scanDate: text("scan_date").notNull(),
    scannedBy: text("scanned_by"),
    operation: text("operation").notNull().default("LOGGI"),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("scans_tracking_number_scan_date_unique").on(
      table.trackingNumber,
      table.scanDate,
    ),
  ],
);

export const insertScanSchema = createInsertSchema(scansTable).omit({
  id: true,
  scannedAt: true,
});
export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scansTable.$inferSelect;
