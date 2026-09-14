import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { scanSessionsTable } from "./scan-sessions";

// Passo 6 do plano da AMAZON: registro manual de avaria. Decisões do
// usuário: campos complementares = tipo/categoria + descrição livre + foto;
// permite registrar mesmo quando o código não está cadastrado no sistema
// (não bloqueia — o pacote pode ainda não ter chegado ao cadastro).
export const avariaCategories = [
  "caixa_amassada",
  "molhado",
  "lacre_violado",
  "conteudo_incompleto",
  "outro",
] as const;
export type AvariaCategory = (typeof avariaCategories)[number];

export const avariasTable = pgTable("avarias", {
  id: serial("id").primaryKey(),
  trackingNumber: text("tracking_number").notNull(),
  operation: text("operation").notNull().default("LOGGI"),
  // Filial dentro da AMAZON (ver plano-implementacao-filiais-amazon). Nula
  // para LOGGI. Herdada do pacote quando ele existe; senão derivada da
  // cidade informada no registro da avaria.
  filial: text("filial"),
  // Opcional, igual scans.sessionId — só a AMAZON usa sessão hoje.
  sessionId: integer("session_id").references(() => scanSessionsTable.id, { onDelete: "set null" }),
  category: text("category").notNull(),
  description: text("description"),
  // Data URL (base64) — sem infra de upload/armazenamento de arquivo neste
  // projeto ainda, então a foto (quando enviada) fica direto na coluna,
  // já comprimida/redimensionada no navegador antes de enviar. Suficiente
  // pro volume esperado de avarias (evento excepcional, não o dia a dia);
  // se o volume crescer muito vale migrar pra um storage de verdade.
  photo: text("photo"),
  status: text("status").notNull().default("registrada"),
  registeredBy: text("registered_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAvariaSchema = createInsertSchema(avariasTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAvaria = z.infer<typeof insertAvariaSchema>;
export type Avaria = typeof avariasTable.$inferSelect;
