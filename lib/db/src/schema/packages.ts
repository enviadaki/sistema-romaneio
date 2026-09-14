import { pgTable, text, serial, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const packagesTable = pgTable(
  "packages",
  {
    id: serial("id").primaryKey(),
    trackingNumber: text("tracking_number").notNull(),
    city: text("city").notNull(),
    promisedDeliveryDate: text("promised_delivery_date").notNull(),
    operation: text("operation").notNull().default("LOGGI"),
    // Subdivisão dentro da AMAZON (ver plano-implementacao-filiais-amazon).
    // Nula para LOGGI e para AMAZON antes das filiais existirem — derivada
    // sozinha a partir de `city` no momento do cadastro, nunca digitada.
    filial: text("filial"),
    // CEP opcional, vindo da planilha de importação (já existe na maioria
    // das planilhas da Amazon, hoje só usado transitoriamente pra corrigir
    // nome de cidade — ver cleanImportedCity no frontend). Guardado cru,
    // sem validação de formato, só como origem do dado — quem manda é
    // `rota`, derivada dele.
    cep: text("cep"),
    // Rota dentro da filial (ver filial-routes.ts/route-ceps.ts) — derivada
    // do CEP no momento do cadastro, nunca digitada, mesmo espírito de
    // `filial`. Nula quando não há CEP, o CEP não está mapeado a nenhuma
    // rota, ou a filial do pacote não usa rotas (hoje só VCA usa).
    rota: text("rota"),
    tipo: text("tipo").notNull().default("AVULSO"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("packages_tracking_number_operation_unique").on(
      table.trackingNumber,
      table.operation,
    ),
  ],
);

export const insertPackageSchema = createInsertSchema(packagesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type Package = typeof packagesTable.$inferSelect;
