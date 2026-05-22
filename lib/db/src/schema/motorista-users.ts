import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const motoristaUsersTable = pgTable("motorista_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull().default(""),
  clerkUserId: text("clerk_user_id").default(""),
  clerkEmail: text("clerk_email").default(""),
  fullName: text("full_name").notNull().default(""),
  allowedRoutes: text("allowed_routes").array().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMotoristaUserSchema = createInsertSchema(motoristaUsersTable).omit({
  id: true,
  createdAt: true,
});

export type MotoristaUser = typeof motoristaUsersTable.$inferSelect;
export type InsertMotoristaUser = z.infer<typeof insertMotoristaUserSchema>;
