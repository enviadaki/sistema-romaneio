import { Router, type IRouter } from "express";
import { eq, inArray, sql, and, gte, lt } from "drizzle-orm";
import { db, packagesTable, scansTable } from "@workspace/db";
import {
  CreatePackageBody,
  BulkCreatePackagesBody,
  DeletePackageParams,
  ListPackagesQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// GET /packages/lookup?trackingNumber=XXX — must come BEFORE /packages/:id
router.get("/packages/lookup", requireAuth, async (req, res): Promise<void> => {
  const trackingNumber = (req.query.trackingNumber as string | undefined)?.trim();
  if (!trackingNumber) {
    res.status(400).json({ error: "trackingNumber é obrigatório" });
    return;
  }

  const [pkg] = await db
    .select()
    .from(packagesTable)
    .where(eq(packagesTable.trackingNumber, trackingNumber))
    .limit(1);

  if (!pkg) {
    res.status(404).json({ error: "Pacote não encontrado" });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const [scan] = await db
    .select()
    .from(scansTable)
    .where(
      and(
        eq(scansTable.trackingNumber, trackingNumber),
        eq(scansTable.scanDate, today)
      )
    )
    .limit(1);

  res.json({
    id: pkg.id,
    trackingNumber: pkg.trackingNumber,
    city: pkg.city,
    promisedDeliveryDate: pkg.promisedDeliveryDate ?? null,
    operation: pkg.operation,
    createdAt: pkg.createdAt.toISOString(),
    scannedToday: !!scan,
    scannedAt: scan?.scannedAt.toISOString() ?? null,
    scannedBy: scan?.scannedBy ?? null,
  });
});

// DELETE /packages/clear — must come BEFORE /packages/:id
router.delete("/packages/clear", requireAuth, async (req, res): Promise<void> => {
  const date = (req.query.date as string | undefined)?.trim();
  const operation = (req.query.operation as string | undefined)?.trim();

  const conditions = [];
  if (date) {
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay   = new Date(`${date}T23:59:59.999Z`);
    conditions.push(gte(packagesTable.createdAt, startOfDay));
    conditions.push(lt(packagesTable.createdAt, endOfDay));
  }
  if (operation) {
    conditions.push(eq(packagesTable.operation, operation));
  }

  const deleted = await db
    .delete(packagesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .returning({ id: packagesTable.id });

  res.json({ deleted: deleted.length });
});

router.get("/packages", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListPackagesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const operation = parsed.data.operation ?? "LOGGI";
  let query = db.select().from(packagesTable).$dynamic();
  const conditions: ReturnType<typeof eq>[] = [];

  conditions.push(eq(packagesTable.operation, operation));

  const citiesParam = (req.query as any).cities as string | undefined;
  if (citiesParam) {
    const cityList = citiesParam.split(",").map((c: string) => c.trim()).filter(Boolean);
    if (cityList.length > 0) conditions.push(inArray(packagesTable.city, cityList) as any);
  } else if (parsed.data.city) {
    conditions.push(eq(packagesTable.city, parsed.data.city));
  }

  query = query.where(and(...conditions));
  const packages = await query.orderBy(packagesTable.createdAt);
  res.json(
    packages.map((p) => ({
      id: p.id,
      trackingNumber: p.trackingNumber,
      city: p.city,
      promisedDeliveryDate: p.promisedDeliveryDate,
      operation: p.operation,
      createdAt: p.createdAt.toISOString(),
    }))
  );
});

router.post("/packages", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePackageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const operation = parsed.data.operation ?? "LOGGI";

  const existing = await db
    .select()
    .from(packagesTable)
    .where(eq(packagesTable.trackingNumber, parsed.data.trackingNumber));

  if (existing.length > 0) {
    res.status(409).json({ error: "Número de rastreio já cadastrado" });
    return;
  }

  const [pkg] = await db
    .insert(packagesTable)
    .values({
      trackingNumber: parsed.data.trackingNumber,
      city: parsed.data.city,
      promisedDeliveryDate: parsed.data.promisedDeliveryDate,
      operation,
    })
    .returning();

  res.status(201).json({
    id: pkg.id,
    trackingNumber: pkg.trackingNumber,
    city: pkg.city,
    promisedDeliveryDate: pkg.promisedDeliveryDate,
    operation: pkg.operation,
    createdAt: pkg.createdAt.toISOString(),
  });
});

router.post("/packages/bulk", requireAuth, async (req, res): Promise<void> => {
  const parsed = BulkCreatePackagesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Top-level operation override (all packages in the bulk use the same operation)
  const bulkOperation = (req.body?.operation as string | undefined) ?? "LOGGI";

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const pkg of parsed.data.packages) {
    try {
      const existing = await db
        .select()
        .from(packagesTable)
        .where(eq(packagesTable.trackingNumber, pkg.trackingNumber));

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      await db.insert(packagesTable).values({
        trackingNumber: pkg.trackingNumber,
        city: pkg.city,
        promisedDeliveryDate: pkg.promisedDeliveryDate,
        operation: pkg.operation ?? bulkOperation,
      });
      imported++;
    } catch {
      errors.push(`Erro ao importar ${pkg.trackingNumber}`);
    }
  }

  res.status(201).json({ imported, skipped, errors });
});

router.delete("/packages/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeletePackageParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [pkg] = await db
    .delete(packagesTable)
    .where(eq(packagesTable.id, params.data.id))
    .returning();

  if (!pkg) {
    res.status(404).json({ error: "Pacote não encontrado" });
    return;
  }

  res.sendStatus(204);
});

router.get("/cities", requireAuth, async (req, res): Promise<void> => {
  const operation = (req.query.operation as string | undefined)?.trim() ?? "LOGGI";
  const rows = await db
    .selectDistinct({ city: packagesTable.city })
    .from(packagesTable)
    .where(eq(packagesTable.operation, operation))
    .orderBy(packagesTable.city);
  res.json(rows.map((r) => r.city));
});

export default router;
