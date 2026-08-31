import { Router, type IRouter, type NextFunction } from "express";
import { eq, asc, inArray, ne, and } from "drizzle-orm";
import {
  db,
  routesTable,
  citiesTable,
  motoristasTable,
  conferentesTable,
  routeCitiesTable,
  operatorUsersTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

async function requireMotoristaManager(req: any, res: any, next: NextFunction): Promise<void> {
  if (req.customRole !== "operator") {
    await requireAdmin(req, res, next);
    return;
  }

  const match = String(req.userId ?? "").match(/^operator_(\d+)$/);
  if (!match) {
    res.status(403).json({ error: "Acesso restrito a usuários autorizados." });
    return;
  }

  const [operator] = await db
    .select({ canManageMotoristas: operatorUsersTable.canManageMotoristas })
    .from(operatorUsersTable)
    .where(eq(operatorUsersTable.id, Number(match[1])));

  if (!operator?.canManageMotoristas) {
    res.status(403).json({ error: "Este usuário não tem permissão para gerenciar motoristas." });
    return;
  }

  next();
}

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

router.get("/admin/motoristas", requireAuth, requireMotoristaManager, async (_req, res): Promise<void> => {
  const rows = await db.select().from(motoristasTable).orderBy(asc(motoristasTable.nome));
  res.json(rows);
});

router.post("/admin/motoristas", requireAuth, requireMotoristaManager, async (req, res): Promise<void> => {
  const { nome, contato } = req.body as { nome?: string; contato?: string };
  if (!nome?.trim()) {
    res.status(400).json({ error: "Nome do motorista é obrigatório" });
    return;
  }
  const [row] = await db.insert(motoristasTable).values({ nome: nome.trim(), contato: contato?.trim() ?? "" }).returning();
  res.status(201).json(row);
});

router.put("/admin/motoristas/:id", requireAuth, requireMotoristaManager, async (req, res): Promise<void> => {
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

router.delete("/admin/motoristas/:id", requireAuth, requireMotoristaManager, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(motoristasTable).where(eq(motoristasTable.id, id));
  res.json({ success: true });
});

// ── Conferentes (lista mestra) ─────────────────────────────────────────────

router.get("/admin/conferentes", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(conferentesTable).orderBy(asc(conferentesTable.nome));
  res.json(rows);
});

router.post("/admin/conferentes", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { nome } = req.body as { nome?: string };
  if (!nome?.trim()) {
    res.status(400).json({ error: "Nome do conferente é obrigatório" });
    return;
  }

  const name = nome.trim();
  const [existing] = await db
    .select({ id: conferentesTable.id })
    .from(conferentesTable)
    .where(eq(conferentesTable.nome, name))
    .limit(1);
  if (existing) {
    res.status(409).json({ error: "Este conferente já está cadastrado" });
    return;
  }

  const [row] = await db.insert(conferentesTable).values({ nome: name }).returning();
  res.status(201).json(row);
});

router.put("/admin/conferentes/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { nome } = req.body as { nome?: string };
  if (!nome?.trim()) {
    res.status(400).json({ error: "Nome do conferente é obrigatório" });
    return;
  }

  const name = nome.trim();
  const [existing] = await db
    .select({ id: conferentesTable.id })
    .from(conferentesTable)
    .where(and(eq(conferentesTable.nome, name), ne(conferentesTable.id, id)))
    .limit(1);
  if (existing) {
    res.status(409).json({ error: "Este conferente já está cadastrado" });
    return;
  }

  const [row] = await db
    .update(conferentesTable)
    .set({ nome: name })
    .where(eq(conferentesTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Conferente não encontrado" });
    return;
  }
  res.json(row);
});

router.delete("/admin/conferentes/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(conferentesTable).where(eq(conferentesTable.id, id));
  res.json({ success: true });
});

export default router;
