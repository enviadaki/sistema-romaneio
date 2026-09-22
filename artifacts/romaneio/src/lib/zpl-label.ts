// Etiqueta ZPL impressa a cada bipagem aceita no Pré-Sorter da LOGGI (modo
// "Rota") — pedido do usuário: aproveitar a base de dados na hora do bipe
// pra imprimir uma etiqueta de separação física na esteira/mesa, numa
// Zebra ZQ630 pareada por Bluetooth com o mesmo PC da bipagem, etiqueta
// 61x40mm, sem clicar em nada (ver qz-print.ts pra como o ZPL chega na
// impressora).
//
// Dimensões da etiqueta em pontos (dots) — depende da resolução da
// impressora, não só do tamanho físico. A maioria das ZQ630 vendidas no
// Brasil é 203dpi (8 dots/mm); se a sua for a variante 300dpi (12 dots/mm),
// troque PRINT_DOTS_PER_MM abaixo — é o único número que precisa mudar,
// todo o resto do layout é calculado a partir dele.
const PRINT_DOTS_PER_MM = 8;

const LABEL_WIDTH_MM = 61;
const LABEL_HEIGHT_MM = 40;
const LABEL_WIDTH_DOTS = LABEL_WIDTH_MM * PRINT_DOTS_PER_MM;
const LABEL_HEIGHT_DOTS = LABEL_HEIGHT_MM * PRINT_DOTS_PER_MM;

// Largura do módulo (barra mais fina) do código de barras, em dots. 2 dots
// a 203dpi (~0,25mm/módulo) é um bom equilíbrio entre "cabe na largura da
// etiqueta" e "continua fácil de ler com leitor de mão" pra códigos de
// rastreio de até uns 18-20 caracteres — a LOGGI não tem um formato fixo de
// código (diferente do TBR da AMAZON), então esse valor é conservador. Se
// os códigos de rastreio da LOGGI forem tipicamente mais longos que isso e
// o código de barras sair cortado na etiqueta impressa, reduza para 1.
const BARCODE_MODULE_WIDTH = 2;
const BARCODE_HEIGHT_DOTS = 60;

// Tira caracteres que quebrariam o fluxo de comandos ZPL se aparecessem
// dentro de um campo de texto (^ e ~ são prefixos de comando na linguagem
// ZPL) — nunca deveria acontecer com cidade/rota/rastreio normais, mas é
// defesa barata contra dado inesperado virando etiqueta corrompida ou,
// pior, comando não intencional na impressora.
function sanitizeZplField(value: string): string {
  return value.replace(/[\^~]/g, "").trim();
}

export interface LoggiLabelInput {
  city: string;
  routeName: string;
  trackingNumber: string;
}

// DD/MM HH:mm em horário local do navegador (mesmo fuso de quem está
// bipando, que é o que importa pra saber "quando isso saiu da esteira").
function formatLabelDateTime(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${mi}`;
}

// Monta o ZPL completo pra uma etiqueta do Pré-Sorter LOGGI. Cidade domina
// visualmente (pedido do usuário) — é o que decide fisicamente pra qual
// pilha o pacote vai; rota vem logo abaixo, menor; código de barras no
// meio (com o próprio número de rastreio escrito embaixo, pra conferência
// manual se o leitor falhar); operação + data/hora no rodapé.
export function buildLoggiPreSorterLabelZpl({ city, routeName, trackingNumber }: LoggiLabelInput): string {
  const safeCity = sanitizeZplField(city).toUpperCase() || "?";
  const safeRoute = sanitizeZplField(routeName) || "-";
  const safeTracking = sanitizeZplField(trackingNumber) || "?";
  const footer = `LOGGI  ${formatLabelDateTime(new Date())}`;

  const contentWidth = LABEL_WIDTH_DOTS - 20; // 10 dots de margem de cada lado

  return [
    "^XA",
    "^CI28", // UTF-8, pra cidade/rota com acento saírem certas
    `^PW${LABEL_WIDTH_DOTS}`,
    `^LL${LABEL_HEIGHT_DOTS}`,
    // Cidade — texto dominante, grande, centralizado.
    `^FO10,8^A0N,50,50^FB${contentWidth},1,0,C^FD${safeCity}^FS`,
    // Rota — menor, logo abaixo.
    `^FO10,64^A0N,26,26^FB${contentWidth},1,0,C^FD${safeRoute}^FS`,
    // Código de barras (Code 128) do rastreio, sem linha de interpretação
    // embutida — a gente escreve o número embaixo com fonte própria, pra
    // ter controle do tamanho/posição em vez de depender do tamanho
    // variável da linha automática da ZPL. Sem ^FB aqui de propósito — o
    // comportamento de ^FB (quebra/centralização de texto) em campos de
    // código de barras varia entre modelos Zebra; alinhado à esquerda com
    // uma margem fixa é o jeito confiável de garantir que sempre imprime.
    `^BY${BARCODE_MODULE_WIDTH},2,${BARCODE_HEIGHT_DOTS}`,
    `^FO30,104^BCN,${BARCODE_HEIGHT_DOTS},N,N,N^FD${safeTracking}^FS`,
    // Número do rastreio em texto legível, logo abaixo do código de barras.
    `^FO10,${104 + BARCODE_HEIGHT_DOTS + 10}^A0N,24,24^FB${contentWidth},1,0,C^FD${safeTracking}^FS`,
    // Rodapé: operação + data/hora do bipe.
    `^FO10,${LABEL_HEIGHT_DOTS - 30}^A0N,18,18^FB${contentWidth},1,0,C^FD${footer}^FS`,
    "^XZ",
  ].join("\n");
}
