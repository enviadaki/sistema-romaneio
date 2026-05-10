import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, scansTable, packagesTable } from "@workspace/db";
import { GetRomaneioQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/romaneio", async (req, res): Promise<void> => {
  const parsed = GetRomaneioQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { city, date } = parsed.data;

  const scans = await db
    .select()
    .from(scansTable)
    .where(and(eq(scansTable.city, city), eq(scansTable.scanDate, date)));

  const trackingNumbers = scans.map((s) => s.trackingNumber);

  const packagesResult = trackingNumbers.length > 0
    ? await db
        .select()
        .from(packagesTable)
        .where(eq(packagesTable.city, city))
    : [];

  const packageMap = new Map(
    packagesResult.map((p) => [p.trackingNumber, p])
  );

  const romaneioItems = scans.map((s) => {
    const pkg = packageMap.get(s.trackingNumber);
    return {
      trackingNumber: s.trackingNumber,
      promisedDeliveryDate: pkg?.promisedDeliveryDate ?? "",
    };
  });

  res.json({
    city,
    date,
    totalCount: romaneioItems.length,
    packages: romaneioItems,
  });
});

export default router;
