import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
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

  const scansWhere =
    cityList.length === 1
      ? and(eq(scansTable.city, cityList[0]), eq(scansTable.scanDate, date))
      : and(inArray(scansTable.city, cityList), eq(scansTable.scanDate, date));

  const scans = await db.select().from(scansTable).where(scansWhere);

  const packagesResult =
    scans.length > 0
      ? await db
          .select()
          .from(packagesTable)
          .where(
            cityList.length === 1
              ? eq(packagesTable.city, cityList[0])
              : inArray(packagesTable.city, cityList),
          )
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
