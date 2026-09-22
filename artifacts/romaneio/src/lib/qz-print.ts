// Integração com o QZ Tray (https://qz.io) — ponte local que roda no PC do
// operador e permite imprimir direto numa impressora instalada (USB,
// Bluetooth ou rede) a partir do navegador, sem abrir a caixa de diálogo de
// impressão do Chrome. Usado pelo Pré-Sorter pra imprimir a etiqueta da
// Zebra a cada bipagem aceita (ver zpl-label.ts).
//
// Requer que o programa QZ Tray esteja instalado e rodando no PC (ver
// instruções de instalação entregues junto com esse patch) — se não
// estiver, todas as funções aqui rejeitam a Promise, e quem chama decide o
// que fazer (o Pré-Sorter nunca deixa isso travar a bipagem em si).
//
// Carregado via <script> estático (public/vendor/qz-tray.js) em vez de
// import de módulo — o pacote npm da QZ usa `require()` condicionalmente
// (pra detectar dependências opcionais em ambiente Node), o que não bunda
// de forma confiável com o Vite/Rollup. Como script solto, ele expõe
// `window.qz` global, exatamente como a própria QZ Tray documenta.
declare global {
  interface Window {
    qz?: any;
  }
}

const QZ_SCRIPT_SRC = "/vendor/qz-tray.js";

let scriptLoadPromise: Promise<void> | null = null;

function loadQzTrayScript(): Promise<void> {
  if (window.qz) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${QZ_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar qz-tray.js")));
      return;
    }
    const script = document.createElement("script");
    script.src = QZ_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar qz-tray.js"));
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

let connectPromise: Promise<void> | null = null;

// Conecta uma vez só (conexões concorrentes reusam a mesma Promise) — QZ
// Tray precisa estar instalado e rodando no PC. Sem certificado configurado
// (ver README entregue), a primeira conexão de uma sessão do navegador
// mostra um popup do QZ Tray perguntando se autoriza o site — marcando
// "Remember this decision" ali, não pergunta mais nas próximas vezes nesse
// mesmo PC/navegador.
export function ensureQzConnected(): Promise<void> {
  if (connectPromise) return connectPromise;

  connectPromise = loadQzTrayScript().then(() => {
    const qz = window.qz;
    if (!qz) throw new Error("qz-tray.js carregado mas window.qz não existe");
    if (qz.websocket.isActive()) return;
    return qz.websocket.connect({ retries: 2, delay: 1 });
  });

  // Se a conexão falhar, não trava tentativas futuras (ex.: QZ Tray foi
  // aberto depois) — libera a memoização pra próxima chamada tentar de novo.
  connectPromise.catch(() => {
    connectPromise = null;
  });

  return connectPromise;
}

// Imprime um ZPL cru numa impressora já instalada no PC (ver
// zpl-label.ts pro conteúdo da etiqueta do Pré-Sorter). `printerName` é
// exatamente o nome que a impressora tem no Windows/QZ Tray — configurável
// na tela (ver printer-settings no pre-sorter.tsx), porque cada PC pode
// nomear a impressora pareada por Bluetooth de um jeito diferente.
export async function printZplLabel(printerName: string, zpl: string): Promise<void> {
  await ensureQzConnected();
  const qz = window.qz;
  const config = qz.configs.create(printerName);
  await qz.print(config, [zpl]);
}

// Lista as impressoras que o QZ Tray enxerga no PC — usado só no botão
// "Testar impressão" da tela, pra ajudar a achar o nome exato sem precisar
// abrir o painel de impressoras do Windows.
export async function listQzPrinters(): Promise<string[]> {
  await ensureQzConnected();
  const qz = window.qz;
  const found = await qz.printers.find();
  return Array.isArray(found) ? found : [found];
}
