import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { routesTable } from "./routes";

// Vínculo CEP -> rota da LOGGI (ver routes.ts / route-cities.ts, que resolvem
// rota por cidade inteira). Mesmo espírito de route-ceps.ts (AMAZON, ligado a
// filial_routes), só que aqui a rota dona é uma linha de `routes`
// (routesTable) — o mesmo conceito já usado pela integração Arco/LOGGI — em
// vez de uma filial_route.
//
// Existe pra dar granularidade de bairro só onde a cidade inteira não é
// suficiente pra separar destino (hoje só Vitória da Conquista, que virou
// várias sub-rotas "7.1", "7.2"... uma por bairro, com romaneio próprio cada
// uma — ver módulo loggi/rota.ts: resolveLoggiRotaForCep é tentado primeiro,
// e só cai pro mapeamento por cidade inteira (routeCitiesTable) quando o CEP
// não bate aqui — nenhuma outra cidade tem CEP cadastrado nesta tabela, então
// o comportamento delas continua 100% igual ao de antes.
//
// `cep` guarda só dígitos (8 caracteres, sem hífen) — normalizado no momento
// do cadastro/importação, igual já se faz em route_ceps.ts (AMAZON).
export const loggiRouteCepsTable = pgTable("loggi_route_ceps", {
  id: serial("id").primaryKey(),
  cep: text("cep").notNull().unique(),
  routeId: integer("route_id")
    .notNull()
    .references(() => routesTable.id, { onDelete: "cascade" }),
  // Bairro de origem (da planilha usada pra popular a tabela) — guardado só
  // como referência/depuração, mesmo espírito do campo `bairro` em
  // route-ceps.ts: quem manda no agrupamento é routeId, não este campo.
  bairro: text("bairro"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLoggiRouteCepSchema = createInsertSchema(loggiRouteCepsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertLoggiRouteCep = z.infer<typeof insertLoggiRouteCepSchema>;
export type LoggiRouteCep = typeof loggiRouteCepsTable.$inferSelect;
