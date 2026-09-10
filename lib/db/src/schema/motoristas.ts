import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const motoristasTable = pgTable("motoristas", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull().unique(),
  contato: text("contato").notNull().default(""),
  chavePix: text("chave_pix").notNull().default(""),
  favorecido: text("favorecido").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Motorista = typeof motoristasTable.$inferSelect;
