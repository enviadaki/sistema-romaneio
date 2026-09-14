import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { filialRoutesTable } from "./filial-routes";

// Vínculo CEP -> rota (ver filial-routes.ts). Mesmo espírito de
// filial_cities: chave única por CEP, garantindo no próprio schema que um
// CEP pertence a no máximo uma rota — não só por checagem de tela.
//
// `cep` guarda só dígitos (8 caracteres, sem hífen) — normalizado no
// momento da importação/cadastro, igual já se faz hoje com cidade/filial.
export const routeCepsTable = pgTable("route_ceps", {
  id: serial("id").primaryKey(),
  cep: text("cep").notNull().unique(),
  routeId: integer("route_id")
    .notNull()
    .references(() => filialRoutesTable.id, { onDelete: "cascade" }),
  // Bairro de origem (da planilha usada pra popular a tabela) — guardado só
  // como referência/depuração; quem manda no agrupamento é routeId, não
  // este campo (hoje bairro e rota são a mesma coisa, 1 pra 1, mas isso
  // pode mudar sem precisar alterar o schema de novo).
  bairro: text("bairro"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRouteCepSchema = createInsertSchema(routeCepsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertRouteCep = z.infer<typeof insertRouteCepSchema>;
export type RouteCep = typeof routeCepsTable.$inferSelect;
