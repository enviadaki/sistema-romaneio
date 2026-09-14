import type { Request } from "express";

/**
 * Plano de filiais dentro da AMAZON: espelha requireOperationAccess.ts, mas
 * para a subdivisão por filial. Só operadores com allowedFiliais restrito
 * (carregado no token — ver requireAuth.ts) são afetados; equipe Clerk e
 * contas de motorista continuam sem restrição, mesmo padrão já usado para
 * operação.
 *
 * Filial só existe dentro da AMAZON — para LOGGI (ou qualquer registro sem
 * filial resolvida, ex: cidade ainda não vinculada a nenhuma filial),
 * `filial` chega como `null` e é sempre permitido, do mesmo jeito que um
 * evento de auditoria sem operação é visível pra todo mundo.
 */

export function getAllowedFiliais(req: Request): string[] | null {
  const allowed = (req as any).allowedFiliais as string[] | undefined;
  if (!allowed || allowed.length === 0) return null;
  return allowed;
}

export function isFilialAllowed(req: Request, filial: string | null): boolean {
  if (filial === null) return true;
  const allowed = getAllowedFiliais(req);
  return allowed === null || allowed.includes(filial);
}

/**
 * Checagem mais estrita, usada só na CRIAÇÃO de um registro novo da AMAZON
 * (pacote, bipagem, avaria, entrega, sessão) — nunca na leitura.
 *
 * `isFilialAllowed` deixa passar `filial === null` pra qualquer um, porque
 * isso é seguro pra registros que já existem hoje (de antes das filiais
 * existirem, ou LOGGI). Mas na hora de CRIAR um registro novo, deixar um
 * operador restrito a uma filial gravar `filial = null` (cidade ainda sem
 * filial cadastrada) seria uma brecha: o registro nasceria visível para
 * todo mundo (null passa pra qualquer restrição), ou seja, um jeito de
 * escapar do próprio isolamento que a filial existe pra garantir.
 *
 * Por isso: quem tem allowedFiliais restrito só pode criar um registro da
 * AMAZON se a cidade já resolver pra uma filial permitida — nunca null.
 * Quem não tem restrição (admin, Clerk, operador sem allowedFiliais)
 * continua podendo cadastrar cidade ainda não vinculada a filial nenhuma,
 * exatamente como já funcionava antes desse recurso existir.
 */
export function canCreateWithFilial(req: Request, operation: string, filial: string | null): boolean {
  if (operation !== "AMAZON") return true;
  const allowed = getAllowedFiliais(req);
  if (allowed === null) return true;
  return filial !== null && allowed.includes(filial);
}
