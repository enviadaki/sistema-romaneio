// Assinatura de mensagens do QZ Tray — resolve o problema relatado: sem
// certificado, toda conexão do navegador com o QZ Tray é "anônima", e o QZ
// Tray NUNCA deixa lembrar uma conexão anônima (o checkbox "Remember" fica
// desabilitado de propósito, por segurança — não é bug) — então o popup
// "Allow" volta a cada pacote bipado. A única forma de imprimir sem clicar
// em nada é assinar cada pedido de impressão com um certificado que o QZ
// Tray da máquina reconheça como confiável (gerado uma vez, localmente, via
// QZ Tray > Advanced > Site Manager no PC da bipagem — instruções entregues
// junto com esse patch).
//
// A chave privada do certificado fica só aqui no servidor (arquivo em
// secrets/, nunca commitado — ver .gitignore e docker-compose.yml) e nunca é
// enviada ao navegador: só o certificado público (não é segredo) e, sob
// pedido, a ASSINATURA de uma string que o QZ Tray manda a cada impressão —
// prova posse da chave sem nunca expor a chave em si.
import fs from "node:fs";
import crypto from "node:crypto";

const CERT_PATH = process.env.QZ_CERTIFICATE_PATH ?? "/app/secrets/qz-certificate.txt";
const KEY_PATH = process.env.QZ_PRIVATE_KEY_PATH ?? "/app/secrets/qz-private-key.pem";

// Cache em memória depois da primeira leitura bem-sucedida — os arquivos só
// mudam num redeploy (que já reinicia o processo), então não precisa reler
// do disco a cada impressão. `undefined` = ainda não tentou ler;
// `null` = tentou e não achou (arquivo ausente ou ilegível).
let certCache: string | null | undefined;
let keyCache: string | null | undefined;

function readOnce(path: string, cache: string | null | undefined): { value: string | null; cache: string | null } {
  if (cache !== undefined) return { value: cache, cache };
  try {
    const value = fs.readFileSync(path, "utf8").trim();
    return { value, cache: value };
  } catch {
    return { value: null, cache: null };
  }
}

// Certificado público — seguro de expor (é o que o QZ Tray usa pra
// reconhecer o site, não concede nada sozinho sem a assinatura abaixo).
export function getQzCertificate(): string | null {
  const result = readOnce(CERT_PATH, certCache);
  certCache = result.cache;
  return result.value;
}

// Assina `toSign` com a chave privada — SHA512withRSA (Node: 'sha512'),
// combinando com qz.security.setSignatureAlgorithm("SHA512") no frontend
// (ver lib/qz-print.ts). Retorna null se a chave ainda não foi configurada
// no servidor — quem chama trata isso como "assinatura indisponível" e o
// QZ Tray cai de volta no fluxo anônimo de hoje (popup "Allow"), sem quebrar
// a impressão.
export function signQzMessage(toSign: string): string | null {
  const result = readOnce(KEY_PATH, keyCache);
  keyCache = result.cache;
  if (!result.value) return null;

  try {
    const signature = crypto.sign("sha512", Buffer.from(toSign, "utf8"), result.value);
    return signature.toString("base64");
  } catch {
    // Chave presente mas em formato inválido — não derruba a rota, só
    // reporta como indisponível (mesmo tratamento de "arquivo ausente").
    return null;
  }
}
