import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deliveryManifestsTable = pgTable("delivery_manifests", {
  id: serial("id").primaryKey(),
  numero: integer("numero").notNull(),
  motorista: text("motorista").notNull(),
  conferente: text("conferente").notNull(),
  contatoMotorista: text("contato_motorista").notNull().default(""),
  rota: text("rota").notNull(),
  rotaPortaAPorta: integer("rota_porta_a_porta").notNull().default(0),
  km: numeric("km", { precision: 10, scale: 2 }),
  valorPorKm: numeric("valor_por_km", { precision: 10, scale: 4 }),
  valorPagamento: numeric("valor_pagamento", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("ABERTO"),
  dataPagamento: text("data_pagamento"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const deliveryManifestItemsTable = pgTable("delivery_manifest_items", {
  id: serial("id").primaryKey(),
  manifestId: integer("manifest_id").notNull(),
  cidade: text("cidade").notNull(),
  empresa: text("empresa").notNull(),
  sacas: integer("sacas").notNull().default(0),
  avulsos: integer("avulsos").notNull().default(0),
  responsavel: text("responsavel").notNull().default(""),
  contato: text("contato").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDeliveryManifestSchema = createInsertSchema(deliveryManifestsTable).omit({
  id: true,
  createdAt: true,
});
export const insertDeliveryManifestItemSchema = createInsertSchema(deliveryManifestItemsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertDeliveryManifest = z.infer<typeof insertDeliveryManifestSchema>;
export type DeliveryManifest = typeof deliveryManifestsTable.$inferSelect;
export type InsertDeliveryManifestItem = z.infer<typeof insertDeliveryManifestItemSchema>;
export type DeliveryManifestItem = typeof deliveryManifestItemsTable.$inferSelect;
