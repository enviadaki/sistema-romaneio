import { Router, type IRouter } from "express";
import { eq, and, inArray, sql, SQL } from "drizzle-orm";
import { db, scansTable, packagesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/romaneio", requireAuth, async (req, res): Promise<void> => {
  const date = (req.query.date as string | undefined)?.trim();
  if (!date) {
    res.status(400).json({ error: "date is required" });
    return;
  }

  const city = (req.query.city as string | undefined)?.trim();
  const citiesParam = (req.query.cities as string | undefined)?.trim();
  const label = (req.query.label as string | undefined)?.trim();
  const operation = (req.query.operation as string | undefined)?.trim() ?? "LOGGI";

  // Route mode: cities comma-separated
  const cityList = citiesParam
    ? citiesParam.split(",").map((c) => c.trim()).filter(Boolean)
    : city
    ? [city]
    : [];

  if (cityList.length === 0) {
    res.status(400).json({ error: "city or cities is required" });
    return;
  }

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

  const romaneioItems = scans
    .map((s) => {
      const pkg = packageMap.get(s.trackingNumber);
      return {
        trackingNumber: s.trackingNumber,
        city: s.city,
        promisedDeliveryDate: pkg?.promisedDeliveryDate ?? "",
      };
    })
    .sort((a, b) => a.city.localeCompare(b.city) || a.trackingNumber.localeCompare(b.trackingNumber));

  const displayLabel = label ?? city ?? cityList[0] ?? "";

  res.json({
    city: displayLabel,
    date,
    totalCount: romaneioItems.length,
    packages: romaneioItems,
  });
});

export default router;
