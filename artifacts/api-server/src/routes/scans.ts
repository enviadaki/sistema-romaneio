import { Router, type IRouter } from "express";
import { eq, and, inArray, gte, lte, sql, SQL } from "drizzle-orm";
import { db, scansTable, packagesTable } from "@workspace/db";
import {
  CreateScanBody,
  BulkCreateScansBody,
  DeleteScanParams,
  ListScansQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOperationAccess } from "../middlewares/requireOperationAccess";
import { normalizeTbrCode } from "../modules/amazon/tbr";

const router: IRouter = Router();

router.get("/scans", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  const parsed = ListScansQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const operation = (req.query.operation as string | undefined)?.trim() ?? "LOGGI";

  let query = db.select().from(scansTable).$dynamic();
  const conditions: ReturnType<typeof eq>[] = [];

  conditions.push(eq(scansTable.operation, operation));

  const citiesParam = (req.query as any).cities as string | undefined;
  if (citiesParam) {
    const cityList = citiesParam.split(",").map((c: string) => c.trim().toLowerCase()).filter(Boolean);
    if (cityList.length > 0) {
      conditions.push(
        inArray(sql`lower(${scansTable.city})`, cityList) as unknown as SQL
      );
    }
  } else if (parsed.data.city) {
    conditions.push(
      sql`lower(${scansTable.city}) = lower(${parsed.data.city})` as unknown as SQL
    );
  }
  if (parsed.data.date) {
    conditions.push(eq(scansTable.scanDate, parsed.data.date));
  } else if (parsed.data.dateFrom || parsed.data.dateTo) {
    if (parsed.data.dateFrom) conditions.push(gte(scansTable.scanDate, parsed.data.dateFrom) as any);
    if (parsed.data.dateTo) conditions.push(lte(scansTable.scanDate, parsed.data.dateTo) as any);
  }

  query = query.where(and(...conditions));
  const scans = await query.orderBy(scansTable.scannedAt);
  res.json(
    scans.map((s) => ({
      id: s.id,
      trackingNumber: s.trackingNumber,
      city: s.city,
      scanDate: s.scanDate,
      scannedBy: s.scannedBy ?? null,
      operation: s.operation,
      scannedAt: s.scannedAt.toISOString(),
    }))
  );
});

// POST /scans/bulk — must come BEFORE /scans/:id pattern
router.post("/scans/bulk", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  const parsed = BulkCreateScansBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const bulkOperation = (parsed.data.operation ?? "LOGGI").trim();

  // Normaliza (maiúsculas, sem espaços) antes de buscar os pacotes — o
  // cadastro da AMAZON já grava o código normalizado.
  const trackingNumbers =
    bulkOperation === "AMAZON"
      ? parsed.data.trackingNumbers.map((tn) => normalizeTbrCode(tn))
      : parsed.data.trackingNumbers;
  if (trackingNumbers.length === 0) {
    res.json({ created: 0, skipped: 0 });
    return;
  }
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const userFullName = (req as any).userFullName ?? null;

  // Fetch all matching packages in one query — scoped to the active operation
  const pkgs = await db
    .select()
    .from(packagesTable)
    .where(and(
      inArray(packagesTable.trackingNumber, trackingNumbers),
      eq(packagesTable.operation, bulkOperation),
    ));

  const pkgMap = new Map(pkgs.map((p) => [p.trackingNumber, p]));

  let created = 0;
  let skipped = 0;

  for (const tn of trackingNumbers) {
    const pkg = pkgMap.get(tn);
    if (!pkg) { skipped++; continue; }

    const [inserted] = await db
      .insert(scansTable)
      .values({
        trackingNumber: pkg.trackingNumber,
        city: pkg.city,
        scanDate: today,
        scannedBy: userFullName,
        operation: pkg.operation,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted) created++;
    else skipped++;
  }

  res.json({ created, skipped });
});

router.post("/scans", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  const parsed = CreateScanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const scanOperation = (parsed.data.operation ?? "LOGGI").trim();

  // Normaliza (maiúsculas, sem espaços) antes de buscar — o cadastro da
  // AMAZON já grava o código normalizado.
  const trackingNumber =
    scanOperation === "AMAZON" ? normalizeTbrCode(parsed.data.trackingNumber) : parsed.data.trackingNumber;

  const [pkg] = await db
    .select()
    .from(packagesTable)
    .where(and(
      eq(packagesTable.trackingNumber, trackingNumber),
      eq(packagesTable.operation, scanOperation),
    ));

  if (!pkg) {
    res.status(404).json({ error: "Rastreio não encontrado na base" });
    return;
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const userFullName = (req as any).userFullName ?? null;

  const [scan] = await db
    .insert(scansTable)
    .values({
      trackingNumber: pkg.trackingNumber,
      city: pkg.city,
      scanDate: today,
      scannedBy: userFullName,
      operation: pkg.operation,
    })
    .onConflictDoNothing()
    .returning();

  if (!scan) {
    // Duplicidade: busca a bipagem original pra informar quando e por quem
    // ela aconteceu, em vez de só recusar sem contexto (item 9 do plano —
    // "mostrar dados suficientes para o operador entender quando ou onde
    // ocorreu a primeira bipagem").
    const [original] = await db
      .select()
      .from(scansTable)
      .where(and(
        eq(scansTable.trackingNumber, pkg.trackingNumber),
        eq(scansTable.scanDate, today),
        eq(scansTable.operation, pkg.operation),
      ))
      .limit(1);
    res.status(409).json({
      error: "Pacote já bipado hoje",
      scannedBy: original?.scannedBy ?? null,
      scannedAt: original?.scannedAt.toISOString() ?? null,
    });
    return;
  }

  res.status(201).json({
    id: scan.id,
    trackingNumber: scan.trackingNumber,
    city: scan.city,
    scanDate: scan.scanDate,
    scannedBy: scan.scannedBy ?? null,
    operation: scan.operation,
    scannedAt: scan.scannedAt.toISOString(),
  });
});

router.delete("/scans/:id", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteScanParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const operation = (req.query.operation as string | undefined)?.trim();

  if (!operation) {
    res.status(400).json({ error: "Parâmetro 'operation' é obrigatório para remover bipagens." });
    return;
  }

  // Fetch first to verify operation ownership before deleting
  const [existing] = await db
    .select()
    .from(scansTable)
    .where(eq(scansTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Bipagem não encontrada" });
    return;
  }

  if (existing.operation !== operation) {
    res.status(403).json({ error: "Operação não autorizada para esta bipagem" });
    return;
  }

  await db.delete(scansTable).where(and(eq(scansTable.id, params.data.id), eq(scansTable.operation, operation)));

  res.sendStatus(204);
});

export default router;
