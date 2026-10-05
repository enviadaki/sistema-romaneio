import { pgTable, text, serial, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// "Enviar para o ARCO": fila de envios pra um agente externo (Python, na
// máquina do operador) bipar os códigos no site da Loggi. Diferente da
// integração arco.ts existente (aquela é o Arco nos consultando via
// ARCO_API_KEY); esta aqui é o sentido contrário — nós enfileiramos, o
// agente busca e devolve o resultado via AGENTE_TOKEN.
//
// Não existe uma tabela "romaneio" — a tela de romaneio é uma consulta
// (date + cidade(s)/rota + operation) sobre scans/packages. Por isso o
// envio guarda a identidade do romaneio (escopo) e congela os códigos em
// arco_envio_itens no momento da criação: reprocessar o romaneio depois
// não afeta um envio já criado.
export const arcoEnvioStatuses = [
  "pendente",
  "em_andamento",
  "concluido",
  "concluido_com_erros",
  "falhou",
  "interrompido",
  "cancelado",
] as const;
export type ArcoEnvioStatus = (typeof arcoEnvioStatuses)[number];

export const arcoEnvioItemStatuses = ["pendente", "ok", "erro", "nao_processado"] as const;
export type ArcoEnvioItemStatus = (typeof arcoEnvioItemStatuses)[number];

export const arcoEnvioEscopoTipos = ["cidade", "rota"] as const;
export type ArcoEnvioEscopoTipo = (typeof arcoEnvioEscopoTipos)[number];

export const arcoEnviosTable = pgTable("arco_envios", {
  id: serial("id").primaryKey(),
  operation: text("operation").notNull().default("LOGGI"),
  // Identidade do romaneio de origem (ver comentário acima) — usada pra
  // detectar reenvio duplicado do mesmo romaneio (POST /arco-envios).
  romaneioData: text("romaneio_data").notNull(),
  romaneioEscopoTipo: text("romaneio_escopo_tipo").notNull(),
  // Rota exata (modo "rota") ou cidades ordenadas e separadas por vírgula
  // (modo "cidade") — normalizado na criação pra servir de chave de
  // comparação estável.
  romaneioEscopoValor: text("romaneio_escopo_valor").notNull(),
  romaneioLabel: text("romaneio_label").notNull(),
  status: text("status").notNull().default("pendente"),
  criadoPor: text("criado_por"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  iniciadoEm: timestamp("iniciado_em", { withTimezone: true }),
  finalizadoEm: timestamp("finalizado_em", { withTimezone: true }),
  ultimoHeartbeat: timestamp("ultimo_heartbeat", { withTimezone: true }),
  erroGeral: text("erro_geral"),
  // Reenvio de falhas (ver POST /arco-envios/:id/reenviar-falhas) — aponta
  // pro envio original. Sem FK de verdade pra permitir apagar o original
  // sem travar o histórico do reenvio.
  envioOrigemId: integer("envio_origem_id"),
});

export const arcoEnvioItensTable = pgTable(
  "arco_envio_itens",
  {
    id: serial("id").primaryKey(),
    envioId: integer("envio_id")
      .notNull()
      .references(() => arcoEnviosTable.id, { onDelete: "cascade" }),
    codigo: text("codigo").notNull(),
    status: text("status").notNull().default("pendente"),
    erro: text("erro"),
  },
  (table) => [uniqueIndex("arco_envio_itens_envio_id_codigo_unique").on(table.envioId, table.codigo)],
);

// Presença do agente — linha única (id fixo) atualizada em "melhor esforço"
// em qualquer chamada autenticada do agente, pra alimentar o indicador
// online/offline mesmo quando não há envio pendente/em andamento (ver
// requireAgenteToken.ts).
export const arcoAgenteStatusTable = pgTable("arco_agente_status", {
  id: integer("id").primaryKey(),
  ultimoVistoEm: timestamp("ultimo_visto_em", { withTimezone: true }).notNull(),
});

export const insertArcoEnvioSchema = createInsertSchema(arcoEnviosTable).omit({
  id: true,
  criadoEm: true,
});
export const insertArcoEnvioItemSchema = createInsertSchema(arcoEnvioItensTable).omit({
  id: true,
});

export type InsertArcoEnvio = z.infer<typeof insertArcoEnvioSchema>;
export type ArcoEnvio = typeof arcoEnviosTable.$inferSelect;
export type InsertArcoEnvioItem = z.infer<typeof insertArcoEnvioItemSchema>;
export type ArcoEnvioItem = typeof arcoEnvioItensTable.$inferSelect;
