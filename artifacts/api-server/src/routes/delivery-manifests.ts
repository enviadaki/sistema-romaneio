import { Router, type IRouter } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { db, deliveryManifestsTable, deliveryManifestItemsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function getNextNumero(): Promise<number> {
  const [last] = await db
    .select({ numero: deliveryManifestsTable.numero })
    .from(deliveryManifestsTable)
    .orderBy(desc(deliveryManifestsTable.numero))
    .limit(1);
  return last ? last.numero + 1 : 1;
}

function buildManifestResponse(manifest: any, items: any[]) {
  return {
    id: manifest.id,
    numero: manifest.numero,
    motorista: manifest.motorista,
    conferente: manifest.conferente,
    contatoMotorista: manifest.contatoMotorista,
    rota: manifest.rota,
    rotaPortaAPorta: manifest.rotaPortaAPorta,
    valorPagamento: manifest.valorPagamento ? String(manifest.valorPagamento) : null,
    status: manifest.status,
    dataPagamento: manifest.dataPagamento ?? null,
    observacoes: manifest.observacoes ?? null,
    createdAt: manifest.createdAt.toISOString(),
    items: items.map((it) => ({
      id: it.id,
      manifestId: it.manifestId,
      cidade: it.cidade,
      empresa: it.empresa,
      sacas: it.sacas,
      avulsos: it.avulsos,
      responsavel: it.responsavel,
      contato: it.contato,
    })),
  };
}

// GET /delivery-manifests/preview — must be before /:id
router.get("/delivery-manifests/preview", requireAuth, async (req, res): Promise<void> => {
  const { cities, date } = req.query as Record<string, string>;
  if (!cities || !date) {
    res.status(400).json({ error: "cities e date são obrigatórios" });
    return;
  }
  const cityList = cities.split(",").map((c) => c.trim()).filter(Boolean);
  if (cityList.length === 0) {
    res.json([]);
    return;
  }

  const result = await db.execute(sql`
    SELECT
      s.city                                                            AS cidade,
      s.operation                                                       AS empresa,
      CAST(COUNT(CASE WHEN COALESCE(p.tipo, 'AVULSO') = 'SACA'   THEN 1 END) AS INTEGER) AS sacas,
      CAST(COUNT(CASE WHEN COALESCE(p.tipo, 'AVULSO') = 'AVULSO' THEN 1 END) AS INTEGER) AS avulsos
    FROM scans s
    LEFT JOIN packages p ON s.tracking_number = p.tracking_number
    WHERE s.city = ANY(${cityList})
      AND s.scan_date = ${date}
    GROUP BY s.city, s.operation
    ORDER BY s.city, s.operation
  `);

  res.json(result.rows);
});

// GET /delivery-manifests
router.get("/delivery-manifests", requireAuth, async (req, res): Promise<void> => {
  const conditions: any[] = [];
  const { motorista, status, dateFrom, dateTo } = req.query as Record<string, string>;

  if (motorista) conditions.push(eq(deliveryManifestsTable.motorista, motorista));
  if (status) conditions.push(eq(deliveryManifestsTable.status, status));

  const manifests = await db
    .select()
    .from(deliveryManifestsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(deliveryManifestsTable.createdAt));

  const filtered = manifests.filter((m) => {
    const dateStr = m.createdAt.toISOString().slice(0, 10);
    if (dateFrom && dateStr < dateFrom) return false;
    if (dateTo && dateStr > dateTo) return false;
    return true;
  });

  if (filtered.length === 0) {
    res.json([]);
    return;
  }

  const ids = filtered.map((m) => m.id);
  const allItems = await db
    .select()
    .from(deliveryManifestItemsTable)
    .orderBy(deliveryManifestItemsTable.manifestId);

  const itemsByManifest = new Map<number, any[]>();
  for (const item of allItems) {
    if (!ids.includes(item.manifestId)) continue;
    const list = itemsByManifest.get(item.manifestId) ?? [];
    list.push(item);
    itemsByManifest.set(item.manifestId, list);
  }

  res.json(filtered.map((m) => buildManifestResponse(m, itemsByManifest.get(m.id) ?? [])));
});

// GET /delivery-manifests/:id
router.get("/delivery-manifests/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [manifest] = await db
    .select()
    .from(deliveryManifestsTable)
    .where(eq(deliveryManifestsTable.id, id));
  if (!manifest) {
    res.status(404).json({ error: "Romaneio não encontrado" });
    return;
  }
  const items = await db
    .select()
    .from(deliveryManifestItemsTable)
    .where(eq(deliveryManifestItemsTable.manifestId, id));
  res.json(buildManifestResponse(manifest, items));
});

// POST /delivery-manifests
router.post("/delivery-manifests", requireAuth, async (req, res): Promise<void> => {
  const { motorista, conferente, contatoMotorista, rota, rotaPortaAPorta, valorPagamento, observacoes, items } =
    req.body;

  if (!motorista || !conferente || !rota) {
    res.status(400).json({ error: "motorista, conferente e rota são obrigatórios" });
    return;
  }

  const numero = await getNextNumero();

  const [manifest] = await db
    .insert(deliveryManifestsTable)
    .values({
      numero,
      motorista,
      conferente,
      contatoMotorista: contatoMotorista ?? "",
      rota,
      rotaPortaAPorta: rotaPortaAPorta ?? 0,
      valorPagamento: valorPagamento ?? null,
      status: "ABERTO",
      observacoes: observacoes ?? null,
    })
    .returning();

  const savedItems: any[] = [];
  if (Array.isArray(items) && items.length > 0) {
    for (const item of items) {
      const [saved] = await db
        .insert(deliveryManifestItemsTable)
        .values({
          manifestId: manifest.id,
          cidade: item.cidade,
          empresa: item.empresa,
          sacas: item.sacas ?? 0,
          avulsos: item.avulsos ?? 0,
          responsavel: item.responsavel ?? "",
          contato: item.contato ?? "",
        })
        .returning();
      savedItems.push(saved);
    }
  }

  res.status(201).json(buildManifestResponse(manifest, savedItems));
});

// PATCH /delivery-manifests/:id/status
router.patch("/delivery-manifests/:id/status", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { status, valorPagamento, dataPagamento } = req.body;

  if (!status) {
    res.status(400).json({ error: "status é obrigatório" });
    return;
  }

  const updateData: any = { status };
  if (valorPagamento !== undefined) updateData.valorPagamento = valorPagamento;
  if (dataPagamento !== undefined) updateData.dataPagamento = dataPagamento;

  const [updated] = await db
    .update(deliveryManifestsTable)
    .set(updateData)
    .where(eq(deliveryManifestsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Romaneio não encontrado" });
    return;
  }

  const items = await db
    .select()
    .from(deliveryManifestItemsTable)
    .where(eq(deliveryManifestItemsTable.manifestId, id));

  res.json(buildManifestResponse(updated, items));
});

// DELETE /delivery-manifests/:id
router.delete("/delivery-manifests/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db
    .delete(deliveryManifestItemsTable)
    .where(eq(deliveryManifestItemsTable.manifestId, id));
  const [deleted] = await db
    .delete(deliveryManifestsTable)
    .where(eq(deliveryManifestsTable.id, id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Romaneio não encontrado" });
    return;
  }
  res.sendStatus(204);
});

export default router;
