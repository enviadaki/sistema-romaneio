import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, packagesTable, scansTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/stats", requireAuth, async (req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);
  const operation = (req.query.operation as string | undefined)?.trim() ?? "LOGGI";

  const [totalPackagesResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(packagesTable)
    .where(eq(packagesTable.operation, operation));

  const [totalScansResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(scansTable)
    .where(and(eq(scansTable.scanDate, today), eq(scansTable.operation, operation)));

  const totalCitiesResult = await db
    .selectDistinct({ city: packagesTable.city })
    .from(packagesTable)
    .where(eq(packagesTable.operation, operation));

  const recentScans = await db
    .select()
    .from(scansTable)
    .where(eq(scansTable.operation, operation))
    .orderBy(sql`${scansTable.scannedAt} desc`)
    .limit(10);

  const packagesByCity = await db
    .select({
      city: packagesTable.city,
      count: sql<number>`count(*)::int`,
    })
    .from(packagesTable)
    .where(eq(packagesTable.operation, operation))
    .groupBy(packagesTable.city)
    .orderBy(sql`count(*) desc`);

  const scansByOperatorRaw = await db
    .select({
      operator: scansTable.scannedBy,
      count: sql<number>`count(*)::int`,
    })
    .from(scansTable)
    .where(and(eq(scansTable.scanDate, today), eq(scansTable.operation, operation)))
    .groupBy(scansTable.scannedBy)
    .orderBy(sql`count(*) desc`);

  const scansByOperator = scansByOperatorRaw.map((row) => ({
    operator: row.operator ?? "Sem identificação",
    count: row.count,
  }));

  const scansByCityRaw = await db
    .select({
      city: scansTable.city,
      count: sql<number>`count(*)::int`,
    })
    .from(scansTable)
    .where(and(eq(scansTable.scanDate, today), eq(scansTable.operation, operation)))
    .groupBy(scansTable.city);

  res.json({
    totalPackages: totalPackagesResult?.count ?? 0,
    totalScansToday: totalScansResult?.count ?? 0,
    totalCities: totalCitiesResult.length,
    recentScans: recentScans.map((s) => ({
      id: s.id,
      trackingNumber: s.trackingNumber,
      city: s.city,
      scanDate: s.scanDate,
      scannedBy: s.scannedBy ?? null,
      scannedAt: s.scannedAt.toISOString(),
    })),
    packagesByCity,
    scansByOperator,
    scansByCity: scansByCityRaw,
  });
});

export default router;
