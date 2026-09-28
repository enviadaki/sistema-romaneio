// Rota da LOGGI, por cidade inteira (ver routes/route_cities/cities no banco
// — hoje só usadas pela integração Arco, arco.ts — e ROUTES em
// routes-data.ts no frontend, mesmo conceito, mas mantido separado do
// cadastro do pacote até agora). Resolvida sozinha a partir da cidade do
// pacote, no momento do cadastro, nunca digitada — mesmo espírito de
// resolveFilialForCity (AMAZON) e resolveRotaForCep (VCA), só que aqui a
// granularidade é cidade inteira, não CEP/bairro. Ver plano "Bipagem
// Automática": importar a lista já com a rota calculada, pra bipagem só
// confirmar e imprimir, sem escolher rota manualmente na tela.
import { db, routeCitiesTable, citiesTable, routesTable, cityCorrectionsTable, loggiRouteCepsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { normalizeCityKey } from "../amazon/filial";

// Mesmo esquema de cache curto de filial.ts/rota.ts (AMAZON) — o mapa
// cidade->rota muda raro (só quando o admin edita rotas/cidades no cadastro
// da integração Arco) e passa a ser consultado em todo cadastro de pacote
// da LOGGI.
let cache: { map: Map<string, string>; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

async function loadCityRouteMap(): Promise<Map<string, string>> {
  if (cache && cache.expiresAt > Date.now()) return cache.map;

  const rows = await db
    .select({ city: citiesTable.name, route: routesTable.name })
    .from(routeCitiesTable)
    .innerJoin(citiesTable, eq(routeCitiesTable.cityId, citiesTable.id))
    .innerJoin(routesTable, eq(routeCitiesTable.routeId, routesTable.id));

  const map = new Map<string, string>();
  for (const row of rows) {
    // Comparação normalizada (maiúscula, sem acento — normalizeCityKey), não
    // byte a byte: uma planilha com "Vitoria" sem acento ainda precisa bater
    // com a cidade cadastrada como "Vitória". Em empate (duas rotas com o
    // mesmo nome de cidade normalizado, o que não deveria acontecer mas não
    // é garantido pelo schema), fica a primeira encontrada.
    const key = normalizeCityKey(row.city);
    if (!map.has(key)) map.set(key, row.route);
  }
  cache = { map, expiresAt: Date.now() + CACHE_TTL_MS };
  return map;
}

// Chamado sempre que o cadastro de rotas/cidades da integração Arco mudar
// via admin, mesmo padrão de invalidateFilialCityCache — pra não esperar até
// 60s pra uma rota nova ou cidade reatribuída valer.
export function invalidateLoggiCityRouteCache(): void {
  cache = null;
}

// Retorna o nome da rota dona daquela cidade, ou null se a cidade ainda não
// está vinculada a nenhuma rota. Nunca lança erro — cadastro de pacote sem
// rota resolvida continua funcionando normalmente (rota é um dado a mais,
// não um requisito); quem cai em null pode ser roteado manualmente depois
// pelo modo "Rota" do Pré-Sorter, que continua existindo pra esse caso.
export async function resolveLoggiRotaForCity(city: string): Promise<string | null> {
  const map = await loadCityRouteMap();
  const rawKey = normalizeCityKey(city);

  const direct = map.get(rawKey);
  if (direct) return direct;

  // Não bateu direto — confere se já existe uma correção de grafia aprendida
  // pra essa mesma chave (ver routes/city-corrections.ts) antes de desistir.
  // Reaproveita o mesmo dicionário já usado no Cadastro (ex.: "ANAGE (BA)" ->
  // "Anagé"), em vez de duplicar essa lógica aqui.
  const [correction] = await db
    .select({ correctedCity: cityCorrectionsTable.correctedCity })
    .from(cityCorrectionsTable)
    .where(eq(cityCorrectionsTable.rawKey, rawKey));

  if (!correction) return null;
  return map.get(normalizeCityKey(correction.correctedCity)) ?? null;
}

// Rota por CEP/bairro, granularidade mais fina que cidade inteira (ver
// modules/amazon/rota.ts: resolveRotaForCep, mesmo espírito, só que aqui a
// rota dona é uma linha de `routes` em vez de `filial_routes` — ver
// loggi-route-ceps.ts no schema). Hoje só Vitória da Conquista tem CEP
// cadastrado aqui (dividida em sub-rotas "7.1", "7.2"... uma por bairro, ver
// plano "rotas-bairro-conquista-loggi"); nenhuma outra cidade usa isso, então
// elas continuam 100% resolvidas por routeCitiesTable, sem nenhuma mudança.
//
// Mesmo esquema de cache curto das outras funções deste arquivo — o mapa
// muda raro (só quando o admin cadastra CEP novo pra uma rota).
let cepCache: { map: Map<string, string>; expiresAt: number } | null = null;

function normalizeCep(value: string): string {
  return value.replace(/\D/g, "").padStart(8, "0").slice(-8);
}

async function loadRouteCepMap(): Promise<Map<string, string>> {
  if (cepCache && cepCache.expiresAt > Date.now()) return cepCache.map;

  const rows = await db
    .select({ cep: loggiRouteCepsTable.cep, name: routesTable.name })
    .from(loggiRouteCepsTable)
    .innerJoin(routesTable, eq(routesTable.id, loggiRouteCepsTable.routeId));

  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.cep, row.name);
  }
  cepCache = { map, expiresAt: Date.now() + CACHE_TTL_MS };
  return map;
}

// Chamado sempre que o cadastro de CEPs por rota mudar via admin, mesmo
// padrão de invalidateLoggiCityRouteCache.
export function invalidateLoggiRouteCepCache(): void {
  cepCache = null;
}

// Retorna o nome da rota dona daquele CEP, ou null se o CEP não veio, não
// está no formato esperado, ou não está cadastrado (caso de toda cidade que
// não seja Vitória da Conquista hoje). Chamado ANTES de
// resolveLoggiRotaForCity — quando bate aqui, a rota por cidade nem chega a
// ser consultada; quando não bate, cai pro fluxo antigo normalmente.
export async function resolveLoggiRotaForCep(cep: string | null | undefined): Promise<string | null> {
  if (!cep) return null;
  const normalized = normalizeCep(cep);
  if (normalized.length !== 8 || normalized === "00000000") return null;
  const map = await loadRouteCepMap();
  return map.get(normalized) ?? null;
}

export interface LoggiCityRoute {
  city: string;
  route: string;
}

// Mapa completo cidade -> rota, pra tela de pré-visualização da importação
// (Bipagem Automática) calcular a rota de cada linha do lado do cliente,
// antes de confirmar, sem uma chamada ao servidor por linha.
export async function listLoggiCityRoutes(): Promise<LoggiCityRoute[]> {
  const rows = await db
    .select({ city: citiesTable.name, route: routesTable.name })
    .from(routeCitiesTable)
    .innerJoin(citiesTable, eq(routeCitiesTable.cityId, citiesTable.id))
    .innerJoin(routesTable, eq(routeCitiesTable.routeId, routesTable.id))
    .orderBy(citiesTable.name);
  return rows;
}
