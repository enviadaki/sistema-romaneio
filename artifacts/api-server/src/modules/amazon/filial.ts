// Plano de filiais dentro da AMAZON: resolução de filial a partir da cidade.
//
// A cidade em `filial_cities` é comparada de forma normalizada (maiúscula,
// sem acento, espaços colapsados) contra a cidade gravada no registro real
// (packages.city, deliveries.city, etc.) — a mesma cidade em texto livre já
// usada hoje, não a tabela `cities` (que é só cadastro de referência para
// rotas, desacoplada do dado de movimento — ver achados no plano).
import { db, filialCitiesTable, filiaisTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const DIACRITICS = /[̀-ͯ]/g;

// Mesma normalização já usada no frontend para cidade importada (ver
// cadastro.tsx: removeAccents/cityKey) — maiúscula, sem acento, espaços
// colapsados — pra não depender de digitação idêntica byte a byte.
function normalizeCityKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Cache curto em memória — o mapa cidade->filial muda raramente (só quando
// alguém cadastra/edita no admin) e é consultado em toda bipagem/cadastro
// da AMAZON; evita uma query extra por bipagem. TTL curto o bastante para
// uma filial nova cadastrada hoje valer em minutos, sem precisar reiniciar
// o servidor.
let cache: { map: Map<string, string>; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

async function loadFilialCityMap(): Promise<Map<string, string>> {
  if (cache && cache.expiresAt > Date.now()) return cache.map;

  const rows = await db
    .select({ city: filialCitiesTable.city, code: filiaisTable.code })
    .from(filialCitiesTable)
    .innerJoin(filiaisTable, eq(filiaisTable.id, filialCitiesTable.filialId));

  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(normalizeCityKey(row.city), row.code);
  }
  cache = { map, expiresAt: Date.now() + CACHE_TTL_MS };
  return map;
}

// Chamado sempre que o cadastro de filiais/cidades muda (admin-cadastros),
// pra não esperar até 60s pra uma cidade nova valer.
export function invalidateFilialCityCache(): void {
  cache = null;
}

// Retorna o código da filial dona daquela cidade, ou null se a cidade ainda
// não está vinculada a nenhuma filial (cidade só-LOGGI, ou AMAZON ainda não
// cadastrada em nenhuma filial).
export async function resolveFilialForCity(city: string): Promise<string | null> {
  const map = await loadFilialCityMap();
  return map.get(normalizeCityKey(city)) ?? null;
}
