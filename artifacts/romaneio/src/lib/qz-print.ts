// Integração com o QZ Tray (https://qz.io) — ponte local que roda no PC do
// operador e permite imprimir direto numa impressora instalada (USB,
// Bluetooth ou rede) a partir do navegador, sem abrir a caixa de diálogo de
// impressão do Chrome. Usado pelo Pré-Sorter e pela Bipagem Automática pra
// imprimir a etiqueta da Zebra a cada bipagem aceita (ver zpl-label.ts).
//
// Requer que o programa QZ Tray esteja instalado e rodando no PC (ver
// instruções de instalação entregues junto com esse patch) — se não
// estiver, todas as funções aqui rejeitam a Promise, e quem chama decide o
// que fazer (o Pré-Sorter/Bipagem Automática nunca deixam isso travar a
// bipagem em si).
//
// Carregado via <script> estático (public/vendor/qz-tray.js) em vez de
// import de módulo — o pacote npm da QZ usa `require()` condicionalmente
// (pra detectar dependências opcionais em ambiente Node), o que não bunda
// de forma confiável com o Vite/Rollup. Como script solto, ele expõe
// `window.qz` global, exatamente como a própria QZ Tray documenta.
import { customFetch } from "@workspace/api-client-react";

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

// Assinatura das mensagens do QZ Tray (ver modules/qz/signing.ts no
// servidor) — sem isso, toda conexão é "anônima" e o QZ Tray NUNCA deixa
// lembrar uma conexão anônima: o popup "Allow" volta a cada pacote bipado,
// mesmo marcando "Remember" (o checkbox fica desabilitado de propósito,
// comportamento de segurança do próprio QZ Tray, não bug). Com um
// certificado assinando cada pedido, a impressão fica silenciosa (zero
// clique), contanto que esse mesmo certificado já tenha sido gerado e
// instalado localmente no QZ Tray daquele PC (ver Site Manager nas
// instruções entregues junto com esse patch).
//
// Busca o certificado do servidor uma vez só por carregamento de página; se
// o servidor ainda não tiver um configurado (arquivo ausente — ver
// signing.ts), a busca falha silenciosamente e o QZ Tray segue no fluxo
// anônimo de hoje (com popup), sem quebrar a impressão.
let securitySetupPromise: Promise<boolean> | null = null;

async function trySetupQzSecurity(qz: any): Promise<boolean> {
  if (securitySetupPromise) return securitySetupPromise;

  securitySetupPromise = (async () => {
    let certificate: string;
    try {
      certificate = await customFetch<string>("/api/qz/certificate", { responseType: "text" });
      if (!certificate) return false;
    } catch {
      return false;
    }

    qz.security.setCertificatePromise((resolve: (v: string) => void) => resolve(certificate));
    qz.security.setSignatureAlgorithm("SHA512");
    qz.security.setSignaturePromise(
      (toSign: string) => (resolve: (v: string) => void, reject: (e: unknown) => void) => {
        customFetch<string>(`/api/qz/sign?request=${encodeURIComponent(toSign)}`, { responseType: "text" })
          .then(resolve)
          .catch(reject);
      },
    );
    return true;
  })();

  return securitySetupPromise;
}

let connectPromise: Promise<void> | null = null;
// true só depois que connectPromise resolve com sucesso — usado pra
// diferenciar "ainda conectando" (não mexe, deixa a promise em andamento)
// de "já conectou antes" (aí sim vale a pena checar se continua de pé).
let connected = false;

// Conecta uma vez só (conexões concorrentes reusam a mesma Promise) — QZ
// Tray precisa estar instalado e rodando no PC. Com certificado configurado
// no servidor, conecta silenciosamente; sem ele (ainda não configurado
// nesse PC/operação), a primeira conexão de uma sessão do navegador mostra
// o popup do QZ Tray perguntando se autoriza o site, do jeito que já
// funcionava antes desse patch.
//
// Bug corrigido em produção: o QZ Tray pode derrubar a conexão sozinho
// depois de um tempo (PC hibernou, instabilidade de rede, mais de uma aba
// do sistema aberta ao mesmo tempo disputando a mesma conexão) e o
// navegador não avisa a gente sozinho disso. Sem essa checagem, a
// primeira conexão bem-sucedida ficava guardada pra sempre e toda
// impressão seguinte falhava com "A connection to QZ Tray has not been
// established yet", mesmo com o QZ Tray aberto e funcionando — porque a
// gente nunca percebia que a conexão anterior tinha caído.
export function ensureQzConnected(): Promise<void> {
  if (connectPromise && connected && !window.qz?.websocket?.isActive?.()) {
    connectPromise = null;
    connected = false;
  }
  if (connectPromise) return connectPromise;

  connectPromise = loadQzTrayScript().then(async () => {
    const qz = window.qz;
    if (!qz) throw new Error("qz-tray.js carregado mas window.qz não existe");
    await trySetupQzSecurity(qz);
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect({ retries: 2, delay: 1 });
    }
    connected = true;
  });

  // Se a conexão falhar, não trava tentativas futuras (ex.: QZ Tray foi
  // aberto depois) — libera a memoização pra próxima chamada tentar de novo.
  connectPromise.catch(() => {
    connectPromise = null;
    connected = false;
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
