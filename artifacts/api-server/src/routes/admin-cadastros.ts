import { Router, type IRouter } from "express";
import { eq, asc, inArray } from "drizzle-orm";
import { db, routesTable, citiesTable, motoristasTable, routeCitiesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

// ── Rotas ──────────────────────────────────────────────────────────────────

router.get("/admin/routes", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(routesTable).orderBy(asc(routesTable.name));
  res.json(rows);
});

router.post("/admin/routes", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "Nome da rota é obrigatório" });
    return;
  }
  const [row] = await db.insert(routesTable).values({ name: name.trim().toUpperCase() }).returning();
  res.status(201).json(row);
});

router.put("/admin/routes/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "Nome da rota é obrigatório" });
    return;
  }
  const [row] = await db.update(routesTable).set({ name: name.trim().toUpperCase() }).where(eq(routesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Rota não encontrada" }); return; }
  res.json(row);
});

router.delete("/admin/routes/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(routesTable).where(eq(routesTable.id, id));
  res.json({ success: true });
});

// ── Cidades de uma rota ────────────────────────────────────────────────────

// GET /admin/routes/:id/cities
router.get("/admin/routes/:id/cities", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const routeId = Number(req.params.id);
  const rows = await db
    .select({ id: citiesTable.id, name: citiesTable.name })
    .from(routeCitiesTable)
    .innerJoin(citiesTable, eq(routeCitiesTable.cityId, citiesTable.id))
    .where(eq(routeCitiesTable.routeId, routeId))
    .orderBy(asc(citiesTable.name));
  res.json(rows);
});

// PUT /admin/routes/:id/cities  — replaces all city assignments
router.put("/admin/routes/:id/cities", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const routeId = Number(req.params.id);
  const { cityIds } = req.body as { cityIds?: number[] };
  if (!Array.isArray(cityIds)) {
    res.status(400).json({ error: "cityIds deve ser um array" });
    return;
  }
  await db.transaction(async (tx) => {
    await tx.delete(routeCitiesTable).where(eq(routeCitiesTable.routeId, routeId));
    if (cityIds.length > 0) {
      await tx.insert(routeCitiesTable).values(cityIds.map((cityId) => ({ routeId, cityId })));
    }
  });
  const rows = await db
    .select({ id: citiesTable.id, name: citiesTable.name })
    .from(routeCitiesTable)
    .innerJoin(citiesTable, eq(routeCitiesTable.cityId, citiesTable.id))
    .where(eq(routeCitiesTable.routeId, routeId))
    .orderBy(asc(citiesTable.name));
  res.json(rows);
});

// ── Cidades ────────────────────────────────────────────────────────────────

router.get("/admin/cities", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(citiesTable).orderBy(asc(citiesTable.name));
  res.json(rows);
});

router.post("/admin/cities", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "Nome da cidade é obrigatório" });
    return;
  }
  const [row] = await db.insert(citiesTable).values({ name: name.trim().toUpperCase() }).returning();
  res.status(201).json(row);
});

router.put("/admin/cities/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "Nome da cidade é obrigatório" });
    return;
  }
  const [row] = await db.update(citiesTable).set({ name: name.trim().toUpperCase() }).where(eq(citiesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Cidade não encontrada" }); return; }
  res.json(row);
});

router.delete("/admin/cities/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(citiesTable).where(eq(citiesTable.id, id));
  res.json({ success: true });
});

// ── Motoristas (lista mestra) ──────────────────────────────────────────────

router.get("/admin/motoristas", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(motoristasTable).orderBy(asc(motoristasTable.nome));
  res.json(rows);
});

router.post("/admin/motoristas", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { nome, contato } = req.body as { nome?: string; contato?: string };
  if (!nome?.trim()) {
    res.status(400).json({ error: "Nome do motorista é obrigatório" });
    return;
  }
  const [row] = await db.insert(motoristasTable).values({ nome: nome.trim(), contato: contato?.trim() ?? "" }).returning();
  res.status(201).json(row);
});

router.put("/admin/motoristas/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { nome, contato } = req.body as { nome?: string; contato?: string };
  if (!nome?.trim()) {
    res.status(400).json({ error: "Nome do motorista é obrigatório" });
    return;
  }
  const [row] = await db.update(motoristasTable).set({ nome: nome.trim(), contato: contato?.trim() ?? "" }).where(eq(motoristasTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Motorista não encontrado" }); return; }
  res.json(row);
});

router.delete("/admin/motoristas/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(motoristasTable).where(eq(motoristasTable.id, id));
  res.json({ success: true });
});

export default router;
