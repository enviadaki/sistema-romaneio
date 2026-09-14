import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { filiaisTable } from "./filiais";

// Rota dentro de uma filial (ver plano-implementacao-filiais-amazon.md,
// seção "Vitória da Conquista"). Mesma ideia de filial_cities, só que num
// nível mais fino: em vez de cidade -> filial, é CEP -> rota -> filial.
//
// Só existe hoje pra filial Vitória da Conquista (VCA), onde a cidade
// inteira é uma única filial e não dá pra diferenciar destino só pela
// cidade — precisa do bairro/CEP. Desenhada genérica (qualquer filial pode
// ter rotas) porque não custa nada e evita ter que migrar de novo se outra
// filial precisar da mesma granularidade no futuro.
//
// Importante: isto é um conceito NOVO e diferente do `route`/`routes`
// (routesTable) que já existe no sistema — aquele é usado só pela
// integração Arco, só para LOGGI, agrupando cidades inteiras. Este aqui
// (`filial_routes`) é específico da AMAZON, por filial, e granularidade de
// CEP/bairro, não de cidade. Por isso o nome em português, "rota", nos
// campos da API — pra não colidir com o `route` do Arco.
export const filialRoutesTable = pgTable("filial_routes", {
  id: serial("id").primaryKey(),
  filialId: integer("filial_id")
    .notNull()
    .references(() => filiaisTable.id, { onDelete: "cascade" }),
  // Código gravado nos registros (packages.rota, scans.rota) — curto,
  // estável, não muda depois de criado (mesma regra do código da filial).
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFilialRouteSchema = createInsertSchema(filialRoutesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertFilialRoute = z.infer<typeof insertFilialRouteSchema>;
export type FilialRoute = typeof filialRoutesTable.$inferSelect;
