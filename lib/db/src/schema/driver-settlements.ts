import { pgTable, text, serial, timestamp, numeric, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Fechamento financeiro mensal por motorista (abastecimento, descontos, ajudante,
// 10% a mais, viagem, saldo, dados de pagamento) — preenchido manualmente pelo
// financeiro todo mês, um registro por motorista por competência (mês/ano).
export const driverSettlementsTable = pgTable(
  "driver_settlements",
  {
    id: serial("id").primaryKey(),
    motorista: text("motorista").notNull(),
    competencia: text("competencia").notNull(), // formato "YYYY-MM"
    abastecimento: numeric("abastecimento", { precision: 12, scale: 2 }).notNull().default("0"),
    totalDesconto: numeric("total_desconto", { precision: 12, scale: 2 }).notNull().default("0"),
    fechamentoAnterior: numeric("fechamento_anterior", { precision: 12, scale: 2 }).notNull().default("0"),
    ajudante: numeric("ajudante", { precision: 12, scale: 2 }).notNull().default("0"),
    dezPorCentoAMais: numeric("dez_por_cento_a_mais", { precision: 12, scale: 2 }).notNull().default("0"),
    viagem: numeric("viagem", { precision: 12, scale: 2 }).notNull().default("0"),
    saldo: numeric("saldo", { precision: 12, scale: 2 }).notNull().default("0"),
    chavePix: text("chave_pix").notNull().default(""),
    favorecido: text("favorecido").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("driver_settlements_motorista_competencia_unique").on(
      table.motorista,
      table.competencia,
    ),
  ],
);

export const insertDriverSettlementSchema = createInsertSchema(driverSettlementsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDriverSettlement = z.infer<typeof insertDriverSettlementSchema>;
export type DriverSettlement = typeof driverSettlementsTable.$inferSelect;
