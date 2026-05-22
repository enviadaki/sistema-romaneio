import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const conferentesTable = pgTable("conferentes", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Conferente = typeof conferentesTable.$inferSelect;
