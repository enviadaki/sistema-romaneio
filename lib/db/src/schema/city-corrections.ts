import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Correções de grafia de cidade aprendidas ao longo do tempo — complementa
// (sem substituir) o dicionário estático CITY_CORRECTIONS do frontend
// (cadastro.tsx). Enquanto aquele dicionário é fixo (só muda com deploy),
// esta tabela cresce sozinha: toda vez que uma cidade não reconhecida é
// corrigida na importação (manualmente ou por busca de CEP), a correção
// entra aqui e passa a valer pra qualquer importação futura, de qualquer
// usuário, sem precisar de deploy novo.
//
// `rawKey` é a mesma chave normalizada (maiúscula, sem acento, espaços
// colapsados) usada pelo cityKey()/normalizeCityKey() já existentes no
// frontend e em modules/amazon/filial.ts — uma entrada aqui cobre qualquer
// variação de caixa/acentuação do mesmo texto bruto.
export const cityCorrectionsTable = pgTable("city_corrections", {
  id: serial("id").primaryKey(),
  rawKey: text("raw_key").notNull().unique(),
  correctedCity: text("corrected_city").notNull(),
  // 'manual' = usuário digitou/escolheu na tela; 'cep_lookup' = resolvido
  // automaticamente consultando o CEP (ver /cep-lookup) — guardado só como
  // referência/depuração, não muda o comportamento de aplicação.
  source: text("source").notNull().default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCityCorrectionSchema = createInsertSchema(cityCorrectionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertCityCorrection = z.infer<typeof insertCityCorrectionSchema>;
export type CityCorrection = typeof cityCorrectionsTable.$inferSelect;
