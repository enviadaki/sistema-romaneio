import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const routesTable = pgTable("routes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Route = typeof routesTable.$inferSelect;
