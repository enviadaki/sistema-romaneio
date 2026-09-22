// Rota da LOGGI, por cidade inteira (ver routes/route_cities/cities no banco
// — hoje só usadas pela integração Arco, arco.ts — e ROUTES em
// routes-data.ts no frontend, mesmo conceito, mas mantido separado do
// cadastro do pacote até agora). Resolvida sozinha a partir da cidade do
// pacote, no momento do cadastro, nunca digitada — mesmo espírito de
// resolveFilialForCity (AMAZON) e resolveRotaForCep (VCA), só que aqui a
// granularidade é cidade inteira, não CEP/bairro. Ver plano "Bipagem
// Automática": importar a lista já com a rota calculada, pra bipagem só
// confirmar e imprimir, sem escolher rota manualmente na tela.
import { db, routeCitiesTable, citiesTable, routesTable, cityCorrectionsTable } from "@workspace/db";
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
