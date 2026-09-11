// Passo 1 do plano de estruturação da operação AMAZON: mesma validação do
// código TBR usada no backend (artifacts/api-server/src/modules/amazon/tbr.ts),
// espelhada aqui só para dar feedback imediato na tela antes de bater na API.
// O backend continua sendo a fonte da verdade — esta cópia nunca substitui a
// validação de lá. Nada disso se aplica à operação LOGGI, que continua livre
// de formato.

const TBR_FORMAT = /^TBR\d{9}$/;

export type TbrValidationResult =
  | { valid: true; normalized: string }
  | { valid: false; reason: "empty" | "invalid_format"; normalized: string };

export function normalizeTbrCode(raw: string): string {
  return (raw ?? "").replace(/\s+/g, "").toUpperCase();
}

export function validateTbrFormat(raw: string): TbrValidationResult {
  const normalized = normalizeTbrCode(raw);
  if (!normalized) {
    return { valid: false, reason: "empty", normalized };
  }
  if (!TBR_FORMAT.test(normalized)) {
    return { valid: false, reason: "invalid_format", normalized };
  }
  return { valid: true, normalized };
}

export function tbrValidationMessage(reason: "empty" | "invalid_format"): string {
  return reason === "empty"
    ? "Informe ou leia um código de rastreio."
    : "Código fora do padrão TBR (esperado: TBR + 9 dígitos, ex: TBR426326094).";
}
