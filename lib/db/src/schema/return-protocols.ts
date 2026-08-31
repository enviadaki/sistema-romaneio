import { createInsertSchema } from "drizzle-zod";
import { date, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const returnProtocolsTable = pgTable(
  "return_protocols",
  {
    id: serial("id").primaryKey(),
    numero: integer("numero").notNull(),
    status: text("status").notNull().default("EMITIDO"),
    operacao: text("operacao").notNull(),
    motorista: text("motorista").notNull(),
    conferente: text("conferente").notNull(),
    dataDevolucao: date("data_devolucao", { mode: "string" }).notNull(),
    motivo: text("motivo").notNull(),
    observacoes: text("observacoes"),
    cancelamentoMotivo: text("cancelamento_motivo"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("return_protocols_numero_unique").on(table.numero)],
);

export const returnProtocolItemsTable = pgTable("return_protocol_items", {
  id: serial("id").primaryKey(),
  protocolId: integer("protocol_id").notNull(),
  tipo: text("tipo").notNull().default("MANUAL"),
  referencia: text("referencia").notNull(),
  descricao: text("descricao"),
  operacao: text("operacao"),
  cidade: text("cidade"),
  rota: text("rota"),
  prazo: text("prazo"),
  quantidadeVolumes: integer("quantidade_volumes").notNull().default(1),
  observacao: text("observacao"),
});

export const insertReturnProtocolSchema = createInsertSchema(returnProtocolsTable).omit({
  id: true,
  createdAt: true,
});
export const insertReturnProtocolItemSchema = createInsertSchema(returnProtocolItemsTable).omit({
  id: true,
});

export type InsertReturnProtocol = z.infer<typeof insertReturnProtocolSchema>;
export type ReturnProtocol = typeof returnProtocolsTable.$inferSelect;
export type InsertReturnProtocolItem = z.infer<typeof insertReturnProtocolItemSchema>;
export type ReturnProtocolItem = typeof returnProtocolItemsTable.$inferSelect;