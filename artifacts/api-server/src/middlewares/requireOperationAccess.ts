import type { Request, Response, NextFunction } from "express";

/**
 * Passo 0 do plano de estruturação da operação AMAZON: reforçar no backend a
 * permissão por operação que hoje só é aplicada no frontend (esconder menu,
 * travar o seletor). Sem isso, qualquer chamada direta à API pode informar
 * `operation=AMAZON` mesmo vindo de um operador autorizado só para LOGGI, e o
 * servidor aceitava — essa era a lacuna real, já existente hoje.
 *
 * Só contas de operador (login usuário/senha, `operator_users`) carregam uma
 * lista de operações permitidas (ver requireAuth.ts). Equipe autenticada via
 * Clerk e contas de motorista permanecem sem restrição — mesmo comportamento
 * que o frontend já adota (layout.tsx: "everyone else sees all").
 */

// Retorna a lista de operações permitidas para quem fez a requisição, ou
// `null` quando não há restrição (sem token de operador, ou operador com
// lista vazia — o mesmo "vazio = todas" já usado para allowedPages).
export function getAllowedOperations(req: Request): string[] | null {
  const allowed = (req as any).allowedOperations as string[] | undefined;
  if (!allowed || allowed.length === 0) return null;
  return allowed;
}

export function isOperationAllowed(req: Request, operation: string): boolean {
  const allowed = getAllowedOperations(req);
  return allowed === null || allowed.includes(operation);
}

// Middleware genérico: compara a operação alvo da requisição (query param em
// GET/DELETE, campo do corpo em POST/PUT) com as operações permitidas de quem
// chamou, espelhando o mesmo default "LOGGI" que cada rota já usa quando o
// parâmetro não é informado.
//
// Rotas cuja operação alvo não vem direto de query/body — por exemplo,
// quando é derivada de um pacote já existente, ou quando um lote tem
// operação por item — não devem depender deste middleware sozinho: usam
// `isOperationAllowed()` diretamente no handler, depois de resolver a
// operação real envolvida.
export function requireOperationAccess(req: Request, res: Response, next: NextFunction): void {
  const requestedRaw =
    (req.query.operation as string | undefined) ??
    (req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>).operation : undefined);
  const requested = typeof requestedRaw === "string" && requestedRaw.trim() ? requestedRaw.trim() : "LOGGI";

  if (!isOperationAllowed(req, requested)) {
    res.status(403).json({ error: `Acesso negado para a operação '${requested}'.` });
    return;
  }
  next();
}
