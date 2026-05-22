import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cityContactsTable = pgTable("city_contacts", {
  id: serial("id").primaryKey(),
  city: text("city").notNull().unique(),
  responsavel: text("responsavel").notNull(),
  contato: text("contato").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertCityContactSchema = createInsertSchema(cityContactsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCityContact = z.infer<typeof insertCityContactSchema>;
export type CityContact = typeof cityContactsTable.$inferSelect;
