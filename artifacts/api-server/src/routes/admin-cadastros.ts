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
  filiaisTable,
  filialCitiesTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { invalidateFilialCityCache } from "../modules/amazon/filial";

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

router.get("/admin/cities", requireAuth, async (_req, res): Promise<void> => {
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
  const { nome, contato, chavePix, favorecido } = req.body as {
    nome?: string; contato?: string; chavePix?: string; favorecido?: string;
  };
  if (!nome?.trim()) {
    res.status(400).json({ error: "Nome do motorista é obrigatório" });
    return;
  }
  const [row] = await db
    .insert(motoristasTable)
    .values({
      nome: nome.trim(),
      contato: contato?.trim() ?? "",
      chavePix: chavePix?.trim() ?? "",
      favorecido: favorecido?.trim() ?? "",
    })
    .returning();
  res.status(201).json(row);
});

router.put("/admin/motoristas/:id", requireAuth, requireMotoristaManager, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { nome, contato, chavePix, favorecido } = req.body as {
    nome?: string; contato?: string; chavePix?: string; favorecido?: string;
  };
  if (!nome?.trim()) {
    res.status(400).json({ error: "Nome do motorista é obrigatório" });
    return;
  }
  const [row] = await db
    .update(motoristasTable)
    .set({
      nome: nome.trim(),
      contato: contato?.trim() ?? "",
      chavePix: chavePix?.trim() ?? "",
      favorecido: favorecido?.trim() ?? "",
    })
    .where(eq(motoristasTable.id, id))
    .returning();
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

// ── Filiais (plano de filiais dentro da AMAZON) ────────────────────────────
//
// Filial é uma subdivisão só da AMAZON. O código (`code`) é o valor gravado
// nas tabelas de movimento (packages.filial, scans.filial, etc.) e no
// `allowedFiliais` do operador — por isso fica travado depois de criado
// (renomear quebraria o vínculo com registros já gravados); só `name` e
// `isActive` são editáveis.

router.get("/admin/filiais", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(filiaisTable).orderBy(asc(filiaisTable.code));
  res.json(rows);
});

// GET /filiais — versão pública (qualquer usuário autenticado, não só
// admin) só com o essencial para o seletor de filial no frontend, mesmo
// papel que /cities já cumpre para cidade. Só filiais ativas.
router.get("/filiais", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({ id: filiaisTable.id, code: filiaisTable.code, name: filiaisTable.name })
    .from(filiaisTable)
    .where(eq(filiaisTable.isActive, true))
    .orderBy(asc(filiaisTable.code));
  res.json(rows);
});

router.post("/admin/filiais", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { code, name } = req.body as { code?: string; name?: string };
  const normalizedCode = code?.trim().toUpperCase().replace(/\s+/g, "_");
  if (!normalizedCode) {
    res.status(400).json({ error: "Código da filial é obrigatório" });
    return;
  }
  const existing = await db
    .select({ id: filiaisTable.id })
    .from(filiaisTable)
    .where(eq(filiaisTable.code, normalizedCode));
  if (existing.length > 0) {
    res.status(409).json({ error: `Já existe uma filial com o código '${normalizedCode}'` });
    return;
  }
  const [row] = await db
    .insert(filiaisTable)
    .values({ code: normalizedCode, name: name?.trim() ?? "" })
    .returning();
  res.status(201).json(row);
});

router.put("/admin/filiais/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { name, isActive } = req.body as { name?: string; isActive?: boolean };
  const [row] = await db
    .update(filiaisTable)
    .set({
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    })
    .where(eq(filiaisTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Filial não encontrada" });
    return;
  }
  res.json(row);
});

router.delete("/admin/filiais/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  // Cascade em filial_cities (ver schema) — remove os vínculos junto.
  await db.delete(filiaisTable).where(eq(filiaisTable.id, id));
  invalidateFilialCityCache();
  res.json({ success: true });
});

// ── Cidades de uma filial ──────────────────────────────────────────────────
//
// Diferente de route_cities (N:N), aqui é 1:N de verdade: cada cidade só
// pode estar em uma filial (unique em filial_cities.city) — a própria regra
// de "sem sobreposição geográfica entre filiais" garantida pelo schema, não
// só pela tela.

router.get("/admin/filiais/:id/cities", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const filialId = Number(req.params.id);
  const rows = await db
    .select({ id: filialCitiesTable.id, city: filialCitiesTable.city })
    .from(filialCitiesTable)
    .where(eq(filialCitiesTable.filialId, filialId))
    .orderBy(asc(filialCitiesTable.city));
  res.json(rows);
});

router.post("/admin/filiais/:id/cities", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const filialId = Number(req.params.id);
  const { city } = req.body as { city?: string };
  const normalizedCity = city?.trim().toUpperCase().replace(/\s+/g, " ");
  if (!normalizedCity) {
    res.status(400).json({ error: "Nome da cidade é obrigatório" });
    return;
  }

  const [filial] = await db.select().from(filiaisTable).where(eq(filiaisTable.id, filialId));
  if (!filial) {
    res.status(404).json({ error: "Filial não encontrada" });
    return;
  }

  const [conflict] = await db
    .select({ filialId: filialCitiesTable.filialId })
    .from(filialCitiesTable)
    .where(eq(filialCitiesTable.city, normalizedCity));
  if (conflict && conflict.filialId !== filialId) {
    res.status(409).json({
      error: `A cidade '${normalizedCity}' já está vinculada a outra filial. Cada cidade pode pertencer a apenas uma filial.`,
    });
    return;
  }
  if (conflict) {
    res.status(409).json({ error: `A cidade '${normalizedCity}' já está vinculada a esta filial` });
    return;
  }

  const [row] = await db
    .insert(filialCitiesTable)
    .values({ city: normalizedCity, filialId })
    .returning();
  invalidateFilialCityCache();
  res.status(201).json(row);
});

router.delete("/admin/filial-cities/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(filialCitiesTable).where(eq(filialCitiesTable.id, id));
  invalidateFilialCityCache();
  res.json({ success: true });
});

export default router;
