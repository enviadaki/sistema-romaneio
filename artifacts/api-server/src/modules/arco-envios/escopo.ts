// Identidade do romaneio de origem de um envio ARCO — não existe uma
// tabela "romaneio" (ver resolve.ts); a tela de romaneio é identificada
// por (operation, date, rota exata) OU (operation, date, conjunto de
// cidades). `valor` é a chave normalizada usada só pra comparar/detectar
// duplicidade; `rota`/`cities` guardam os valores originais, usados pra
// buscar os pacotes de verdade via resolveRomaneioItems.
export interface RomaneioEscopo {
  tipo: "cidade" | "rota";
  valor: string;
  rota?: string;
  cities?: string[];
}

export function resolveRomaneioEscopo(input: {
  city?: string;
  cities?: string;
  rota?: string;
}): RomaneioEscopo | null {
  const rota = input.rota?.trim();
  if (rota) {
    return { tipo: "rota", valor: rota, rota };
  }

  const cityList = input.cities
    ? input.cities.split(",").map((c) => c.trim()).filter(Boolean)
    : input.city?.trim()
    ? [input.city.trim()]
    : [];

  if (cityList.length === 0) return null;

  const valor = [...new Set(cityList.map((c) => c.toLowerCase()))].sort().join(",");
  return { tipo: "cidade", valor, cities: cityList };
}

export function resolveRomaneioLabel(
  escopo: RomaneioEscopo,
  label: string | undefined,
): string {
  const trimmedLabel = label?.trim();
  if (trimmedLabel) return trimmedLabel;
  return escopo.tipo === "rota" ? escopo.rota! : escopo.cities![0];
}
