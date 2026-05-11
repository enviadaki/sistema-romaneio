import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, packagesTable } from "@workspace/db";
import {
  CreatePackageBody,
  BulkCreatePackagesBody,
  DeletePackageParams,
  ListPackagesQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/packages", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListPackagesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let query = db.select().from(packagesTable).$dynamic();
  const citiesParam = (req.query as any).cities as string | undefined;
  if (citiesParam) {
    const cityList = citiesParam.split(",").map((c: string) => c.trim()).filter(Boolean);
    if (cityList.length > 0) {
      query = query.where(inArray(packagesTable.city, cityList));
    }
  } else if (parsed.data.city) {
    query = query.where(eq(packagesTable.city, parsed.data.city));
  }

  const packages = await query.orderBy(packagesTable.createdAt);
  res.json(
    packages.map((p) => ({
      id: p.id,
      trackingNumber: p.trackingNumber,
      city: p.city,
      promisedDeliveryDate: p.promisedDeliveryDate,
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
    })
    .returning();

  res.status(201).json({
    id: pkg.id,
    trackingNumber: pkg.trackingNumber,
    city: pkg.city,
    promisedDeliveryDate: pkg.promisedDeliveryDate,
    createdAt: pkg.createdAt.toISOString(),
  });
});

router.post("/packages/bulk", requireAuth, async (req, res): Promise<void> => {
  const parsed = BulkCreatePackagesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

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

router.get("/cities", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .selectDistinct({ city: packagesTable.city })
    .from(packagesTable)
    .orderBy(packagesTable.city);
  res.json(rows.map((r) => r.city));
});

export default router;
