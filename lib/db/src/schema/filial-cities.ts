import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { filiaisTable } from "./filiais";

// Vínculo cidade -> filial, pela mesma cidade em TEXTO que já é usada de
// fato em packages.city / scans.city / avarias.city / deliveries.city —
// não pela tabela `cities` (que hoje é só cadastro de referência para
// rotas, desacoplado do dado real de movimento; ver achados registrados em
// plano-implementacao-filiais-amazon.md). Mesma ideia já usada em
// city-contacts.ts: a chave é o texto normalizado da cidade.
//
// `city` é único: cada cidade pertence a no máximo uma filial. Como as
// filiais da AMAZON não têm sobreposição geográfica, essa é a própria regra
// de negócio garantida pelo schema — não só uma checagem de tela.
export const filialCitiesTable = pgTable("filial_cities", {
  id: serial("id").primaryKey(),
  city: text("city").notNull().unique(),
  filialId: integer("filial_id")
    .notNull()
    .references(() => filiaisTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFilialCitySchema = createInsertSchema(filialCitiesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertFilialCity = z.infer<typeof insertFilialCitySchema>;
export type FilialCity = typeof filialCitiesTable.$inferSelect;
