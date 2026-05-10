import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, packagesTable, scansTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/stats", async (req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);

  const [totalPackagesResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(packagesTable);

  const [totalScansResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(scansTable)
    .where(eq(scansTable.scanDate, today));

  const totalCitiesResult = await db
    .selectDistinct({ city: packagesTable.city })
    .from(packagesTable);

  const recentScans = await db
    .select()
    .from(scansTable)
    .orderBy(sql`${scansTable.scannedAt} desc`)
    .limit(10);

  const packagesByCity = await db
    .select({
      city: packagesTable.city,
      count: sql<number>`count(*)::int`,
    })
    .from(packagesTable)
    .groupBy(packagesTable.city)
    .orderBy(sql`count(*) desc`);

  res.json({
    totalPackages: totalPackagesResult?.count ?? 0,
    totalScansToday: totalScansResult?.count ?? 0,
    totalCities: totalCitiesResult.length,
    recentScans: recentScans.map((s) => ({
      id: s.id,
      trackingNumber: s.trackingNumber,
      city: s.city,
      scanDate: s.scanDate,
      scannedAt: s.scannedAt.toISOString(),
    })),
    packagesByCity,
  });
});

export default router;
