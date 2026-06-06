import { Router, type IRouter } from "express";
import { eq, sql, and, isNull } from "drizzle-orm";
import { db, packagesTable, scansTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/stats", requireAuth, async (req, res): Promise<void> => {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
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

  // Packages with no scan record at all — ordered by promised delivery date (most urgent first)
  const unscannedPackages = await db
    .select({
      id: packagesTable.id,
      trackingNumber: packagesTable.trackingNumber,
      city: packagesTable.city,
      promisedDeliveryDate: packagesTable.promisedDeliveryDate,
      createdAt: packagesTable.createdAt,
    })
    .from(packagesTable)
    .leftJoin(scansTable, eq(scansTable.trackingNumber, packagesTable.trackingNumber))
    .where(and(eq(packagesTable.operation, operation), isNull(scansTable.id)))
    .orderBy(packagesTable.promisedDeliveryDate)
    .limit(20);

  const [totalUnscannedResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(packagesTable)
    .leftJoin(scansTable, eq(scansTable.trackingNumber, packagesTable.trackingNumber))
    .where(and(eq(packagesTable.operation, operation), isNull(scansTable.id)));

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
    totalUnscanned: totalUnscannedResult?.count ?? 0,
    unscannedPackages: unscannedPackages.map((p) => ({
      id: p.id,
      trackingNumber: p.trackingNumber,
      city: p.city,
      promisedDeliveryDate: p.promisedDeliveryDate,
    })),
    packagesByCity,
    scansByOperator,
    scansByCity: scansByCityRaw,
  });
});

export default router;
