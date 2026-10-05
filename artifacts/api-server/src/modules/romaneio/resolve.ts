import { and, eq, inArray, sql, SQL } from "drizzle-orm";
import { db, scansTable, packagesTable } from "@workspace/db";

export interface RomaneioItem {
  trackingNumber: string;
  city: string;
  promisedDeliveryDate: string;
}

// Extraído de GET /romaneio (romaneio.ts) pra ser reaproveitado por quem
// mais precisar da mesma lista de pacotes bipados (ex.: criação de envio
// pro ARCO) sem duplicar a lógica de resolução por rota/cidade. Mesma
// consulta, mesmo comportamento — nenhuma mudança no fluxo existente.
export async function resolveRomaneioItems(params: {
  date: string;
  operation: string;
  rota?: string;
  cities?: string[];
}): Promise<RomaneioItem[]> {
  const { date, operation, rota, cities } = params;

  if (rota) {
    const scans = await db
      .select()
      .from(scansTable)
      .where(and(eq(scansTable.rota, rota), eq(scansTable.scanDate, date), eq(scansTable.operation, operation)));

    const packagesResult =
      scans.length > 0
        ? await db
            .select()
            .from(packagesTable)
            .where(and(eq(packagesTable.rota, rota), eq(packagesTable.operation, operation)))
        : [];

    const packageMap = new Map(packagesResult.map((p) => [p.trackingNumber, p]));

    return scans
      .map((s) => {
        const pkg = packageMap.get(s.trackingNumber);
        return {
          trackingNumber: s.trackingNumber,
          city: s.city,
          promisedDeliveryDate: pkg?.promisedDeliveryDate ?? "",
        };
      })
      .sort((a, b) => a.city.localeCompare(b.city) || a.trackingNumber.localeCompare(b.trackingNumber));
  }

  const cityList = cities ?? [];
  if (cityList.length === 0) return [];

  const lowerCities = cityList.map((c) => c.toLowerCase());
  const scanCityCondition =
    lowerCities.length === 1
      ? (sql`lower(${scansTable.city}) = ${lowerCities[0]}` as unknown as SQL)
      : (inArray(sql`lower(${scansTable.city})`, lowerCities) as unknown as SQL);

  const scans = await db
    .select()
    .from(scansTable)
    .where(and(scanCityCondition, eq(scansTable.scanDate, date), eq(scansTable.operation, operation)));

  const pkgCityCondition =
    lowerCities.length === 1
      ? (sql`lower(${packagesTable.city}) = ${lowerCities[0]}` as unknown as SQL)
      : (inArray(sql`lower(${packagesTable.city})`, lowerCities) as unknown as SQL);

  const packagesResult =
    scans.length > 0
      ? await db
          .select()
          .from(packagesTable)
          .where(and(pkgCityCondition, eq(packagesTable.operation, operation)))
      : [];

  const packageMap = new Map(packagesResult.map((p) => [p.trackingNumber, p]));

  return scans
    .map((s) => {
      const pkg = packageMap.get(s.trackingNumber);
      return {
        trackingNumber: s.trackingNumber,
        city: s.city,
        promisedDeliveryDate: pkg?.promisedDeliveryDate ?? "",
      };
    })
    .sort((a, b) => a.city.localeCompare(b.city) || a.trackingNumber.localeCompare(b.trackingNumber));
}
