import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, scansTable, packagesTable } from "@workspace/db";
import {
  CreateScanBody,
  DeleteScanParams,
  ListScansQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/scans", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListScansQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let query = db.select().from(scansTable).$dynamic();
  const conditions = [];
  const citiesParam = (req.query as any).cities as string | undefined;
  if (citiesParam) {
    const cityList = citiesParam.split(",").map((c: string) => c.trim()).filter(Boolean);
    if (cityList.length > 0) conditions.push(inArray(scansTable.city, cityList));
  } else if (parsed.data.city) {
    conditions.push(eq(scansTable.city, parsed.data.city));
  }
  if (parsed.data.date) conditions.push(eq(scansTable.scanDate, parsed.data.date));
  if (conditions.length > 0) query = query.where(and(...conditions));

  const scans = await query.orderBy(scansTable.scannedAt);
  res.json(
    scans.map((s) => ({
      id: s.id,
      trackingNumber: s.trackingNumber,
      city: s.city,
      scanDate: s.scanDate,
      scannedBy: s.scannedBy ?? null,
      scannedAt: s.scannedAt.toISOString(),
    }))
  );
});

router.post("/scans", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateScanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const pkg = await db
    .select()
    .from(packagesTable)
    .where(eq(packagesTable.trackingNumber, parsed.data.trackingNumber));

  if (pkg.length === 0) {
    res.status(404).json({ error: "Rastreio não encontrado na base" });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const existing = await db
    .select()
    .from(scansTable)
    .where(
      and(
        eq(scansTable.trackingNumber, parsed.data.trackingNumber),
        eq(scansTable.scanDate, today)
      )
    );

  if (existing.length > 0) {
    res.status(409).json({ error: "Pacote já bipado hoje" });
    return;
  }

  const userFullName = (req as any).userFullName ?? null;

  const [scan] = await db
    .insert(scansTable)
    .values({
      trackingNumber: parsed.data.trackingNumber,
      city: parsed.data.city,
      scanDate: today,
      scannedBy: userFullName,
    })
    .returning();

  res.status(201).json({
    id: scan.id,
    trackingNumber: scan.trackingNumber,
    city: scan.city,
    scanDate: scan.scanDate,
    scannedBy: scan.scannedBy ?? null,
    scannedAt: scan.scannedAt.toISOString(),
  });
});

router.delete("/scans/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteScanParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [scan] = await db
    .delete(scansTable)
    .where(eq(scansTable.id, params.data.id))
    .returning();

  if (!scan) {
    res.status(404).json({ error: "Bipagem não encontrada" });
    return;
  }

  res.sendStatus(204);
});

export default router;
