import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Sessão/lote de bipagem (Passo 3 do plano da operação AMAZON). Por enquanto
// é só schema — nenhuma tela ainda cria, abre ou fecha uma sessão. A coluna
// scans.session_id é opcional exatamente por isso: a LOGGI continua bipando
// sem sessão, sem nenhuma mudança de comportamento.
export const scanSessionsTable = pgTable("scan_sessions", {
  id: serial("id").primaryKey(),
  operation: text("operation").notNull().default("LOGGI"),
  // Filial dona da sessão (ver plano-implementacao-filiais-amazon). Nula
  // para LOGGI e para AMAZON fora do contexto de filial. Importante: a
  // "sessão aberta" passa a ser única por (operation, filial), não só por
  // operation — senão duas filiais diferentes acabariam compartilhando a
  // mesma sessão/contadores.
  filial: text("filial"),
  // Rota (bairro) dentro da filial, quando a filial exige seleção manual de
  // rota antes de bipar (hoje: Vitória da Conquista / VCA). Nula para
  // filiais sem rotas cadastradas e para LOGGI. Quando presente, a sessão
  // aberta passa a ser única por (operation, filial, rota).
  rota: text("rota"),
  // "open" | "closed"
  status: text("status").notNull().default("open"),
  openedBy: text("opened_by"),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  closedBy: text("closed_by"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

export const insertScanSessionSchema = createInsertSchema(scanSessionsTable).omit({
  id: true,
  openedAt: true,
});
export type InsertScanSession = z.infer<typeof insertScanSessionSchema>;
export type ScanSession = typeof scanSessionsTable.$inferSelect;
