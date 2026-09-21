// Rota dentro de uma filial, derivada por CEP (ver filial-routes.ts e
// route-ceps.ts). Espelha filial.ts (resolveFilialForCity) num nível mais
// fino: CEP -> rota, em vez de cidade -> filial.
import { db, routeCepsTable, filialRoutesTable, filiaisTable, packagesTable } from "@workspace/db";
import { eq, and, isNotNull, sql } from "drizzle-orm";

// CEP pode chegar formatado (12345-678), com espaço, ou como número (perde
// zero à esquerda em planilha aberta no Excel) — normaliza pra 8 dígitos,
// só o essencial. CEP fora do padrão (não bate 8 dígitos depois de limpar)
// não é tratado como erro aqui — simplesmente não vai casar com nada no
// mapa e a rota fica null, mesmo tratamento de "cidade não mapeada" já
// usado em resolveFilialForCity.
function normalizeCep(value: string): string {
  return value.replace(/\D/g, "").padStart(8, "0").slice(-8);
}

// Mesmo esquema de cache curto de filial.ts — o mapa CEP->rota muda raro
// (só quando o admin cadastra CEP novo) e é consultado em todo cadastro da
// AMAZON.
let cache: { map: Map<string, string>; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

async function loadRouteCepMap(): Promise<Map<string, string>> {
  if (cache && cache.expiresAt > Date.now()) return cache.map;

  const rows = await db
    .select({ cep: routeCepsTable.cep, code: filialRoutesTable.code })
    .from(routeCepsTable)
    .innerJoin(filialRoutesTable, eq(filialRoutesTable.id, routeCepsTable.routeId));

  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.cep, row.code);
  }
  cache = { map, expiresAt: Date.now() + CACHE_TTL_MS };
  return map;
}

// Chamado sempre que o cadastro de rotas/CEPs mudar via admin, mesmo padrão
// de invalidateFilialCityCache.
export function invalidateRouteCepCache(): void {
  cache = null;
}

// Retorna o código da rota dona daquele CEP, ou null se o CEP não veio, não
// está no formato esperado, ou ainda não está vinculado a nenhuma rota.
// Nunca lança erro — cadastro de pacote sem rota resolvida continua
// funcionando normalmente (rota é um dado a mais, não um requisito).
export async function resolveRotaForCep(cep: string | null | undefined): Promise<string | null> {
  if (!cep) return null;
  const normalized = normalizeCep(cep);
  if (normalized.length !== 8 || normalized === "00000000") return null;
  const map = await loadRouteCepMap();
  return map.get(normalized) ?? null;
}

export interface FilialRouteOption {
  code: string;
  name: string;
}

// Rotas ativas cadastradas para uma filial (pelo código, ex.: "VCA") — usado
// pelo endpoint público de seleção de bairro no Pré-Sorter e para decidir se
// uma filial exige seleção manual de rota antes de abrir sessão de bipagem
// (ver scan-sessions.ts: uma filial "exige rota" quando tem pelo menos uma
// rota ativa cadastrada — hoje só Vitória da Conquista/VCA).
export async function getActiveRoutesForFilial(filialCode: string): Promise<FilialRouteOption[]> {
  const rows = await db
    .select({ code: filialRoutesTable.code, name: filialRoutesTable.name })
    .from(filialRoutesTable)
    .innerJoin(filiaisTable, eq(filiaisTable.id, filialRoutesTable.filialId))
    .where(and(eq(filiaisTable.code, filialCode), eq(filialRoutesTable.isActive, true)))
    .orderBy(filialRoutesTable.name);
  return rows;
}

// Confere se um código de rota é válido (ativo) para aquela filial — usado
// para validar o `rota` explícito que o frontend manda ao abrir sessão.
export async function isValidRouteForFilial(filialCode: string, rotaCode: string): Promise<boolean> {
  const routes = await getActiveRoutesForFilial(filialCode);
  return routes.some((r) => r.code === rotaCode);
}

// Confere se ESSA cidade específica, dentro da filial, de fato tem rota
// (bairro) mapeada — diferente de getActiveRoutesForFilial, que só olha se
// a FILIAL tem alguma rota cadastrada, não se é dessa cidade. Necessário
// porque uma filial pode cobrir várias cidades sem que todas usem esse
// conceito: a filial VCA hoje engloba tanto Vitória da Conquista (que tem
// bairro mapeado por CEP) quanto ~186 outras cidades que vieram da operação
// AMAZON antiga e nunca tiveram essa divisão — sem checar por cidade, a
// exigência de escolher bairro (pensada só pra Vitória da Conquista)
// vazava pra qualquer cidade da mesma filial, travando a bipagem/abertura
// de sessão pra elas sem nenhuma forma de escolher um bairro (a tela nem
// mostra o seletor fora de Vitória da Conquista). A checagem usa o dado
// real (packages.rota, já resolvido por CEP no cadastro) em vez de uma
// lista de cidades fixa no código — se uma cidade nova ganhar bairro
// mapeado no futuro, passa a exigir sozinha, sem precisar mexer aqui.
export async function cityHasRoutes(filialCode: string, city: string): Promise<boolean> {
  const [row] = await db
    .select({ id: packagesTable.id })
    .from(packagesTable)
    .where(
      and(
        eq(packagesTable.filial, filialCode),
        sql`lower(${packagesTable.city}) = lower(${city})`,
        isNotNull(packagesTable.rota),
      ),
    )
    .limit(1);
  return !!row;
}
