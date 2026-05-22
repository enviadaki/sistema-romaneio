import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const packagesTable = pgTable("packages", {
  id: serial("id").primaryKey(),
  trackingNumber: text("tracking_number").notNull().unique(),
  city: text("city").notNull(),
  promisedDeliveryDate: text("promised_delivery_date").notNull(),
  operation: text("operation").notNull().default("LOGGI"),
  tipo: text("tipo").notNull().default("AVULSO"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPackageSchema = createInsertSchema(packagesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type Package = typeof packagesTable.$inferSelect;
