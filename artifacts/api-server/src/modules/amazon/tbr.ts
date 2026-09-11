// Passo 1 do plano de estruturação da operação AMAZON: validação centralizada
// do código TBR, num módulo só, para não espalhar a regra em várias rotas.
//
// Formato acordado: prefixo "TBR" seguido de 9 dígitos numéricos (ex:
// TBR426326094) — 12 caracteres no total. Nada disso se aplica à operação
// LOGGI, que continua livre de formato (ver item 14 do planejamento: "LOGGI
// não deverá ser obrigada a usar código TBR").

const TBR_FORMAT = /^TBR\d{9}$/;

export type TbrValidationResult =
  | { valid: true; normalized: string }
  | { valid: false; reason: "empty" | "invalid_format"; normalized: string };

// Normalização: remove espaços nas pontas e no meio (código de barras lido
// por câmera às vezes injeta espaço/quebra de linha), converte para
// maiúsculas — evita diferenças por entrada manual ou leitura de leitor.
export function normalizeTbrCode(raw: string): string {
  return (raw ?? "").replace(/\s+/g, "").toUpperCase();
}

// Valida o formato do código TBR já normalizado. Não verifica se o pacote
// existe cadastrado nem duplicidade — isso é responsabilidade de quem chama
// (a rota consulta o banco depois de confirmar que o formato está correto).
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
