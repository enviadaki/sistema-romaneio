import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const operatorUsersTable = pgTable("operator_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull().default(""),
  fullName: text("full_name").notNull().default(""),
  allowedOperations: text("allowed_operations").array().notNull().default([]),
  allowedPages: text("allowed_pages").array().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOperatorUserSchema = createInsertSchema(operatorUsersTable).omit({
  id: true,
  createdAt: true,
});

export type OperatorUser = typeof operatorUsersTable.$inferSelect;
export type InsertOperatorUser = z.infer<typeof insertOperatorUserSchema>;
