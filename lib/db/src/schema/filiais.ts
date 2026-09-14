import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Filial: subdivisão dentro da operação AMAZON (ver plano-implementacao-
// filiais-amazon). Cada filial cobre um conjunto de cidades exclusivo, sem
// sobreposição — o vínculo cidade -> filial fica em filial-cities.ts.
// LOGGI não usa filial; a tabela é ignorada inteiramente para ela.
export const filiaisTable = pgTable("filiais", {
  id: serial("id").primaryKey(),
  // Código curto usado como valor gravado nas tabelas de movimento (mesmo
  // papel que a string "AMAZON"/"LOGGI" já cumpre para operação) — ex: ITABUNA.
  code: text("code").notNull().unique(),
  name: text("name").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFilialSchema = createInsertSchema(filiaisTable).omit({
  id: true,
  createdAt: true,
});
export type InsertFilial = z.infer<typeof insertFilialSchema>;
export type Filial = typeof filiaisTable.$inferSelect;
