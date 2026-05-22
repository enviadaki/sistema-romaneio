import { Router, type IRouter } from "express";
import { eq, asc, sql } from "drizzle-orm";
import { db, cityContactsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// GET /city-contacts — all cities
router.get("/city-contacts", requireAuth, async (req, res): Promise<void> => {
  const contacts = await db.select().from(cityContactsTable).orderBy(asc(cityContactsTable.city));
  res.json(contacts);
});

// GET /city-contacts/motoristas — unique motoristas list
router.get("/city-contacts/motoristas", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .selectDistinct({ motorista: cityContactsTable.motorista, conferente: cityContactsTable.conferente, contatoMotorista: cityContactsTable.contatoMotorista })
    .from(cityContactsTable)
    .where(sql`${cityContactsTable.motorista} != ''`)
    .orderBy(asc(cityContactsTable.motorista));
  // deduplicate by motorista name keeping first conferente seen
  const seen = new Map<string, { motorista: string; conferente: string; contatoMotorista: string }>();
  for (const r of rows) {
    if (!seen.has(r.motorista)) seen.set(r.motorista, r);
  }
  res.json(Array.from(seen.values()));
});

// GET /city-contacts/by-motorista/:motorista — all cities for a motorista
router.get("/city-contacts/by-motorista/:motorista", requireAuth, async (req, res): Promise<void> => {
  const motorista = decodeURIComponent(
    Array.isArray(req.params.motorista) ? req.params.motorista[0] : req.params.motorista
  );
  const contacts = await db
    .select()
    .from(cityContactsTable)
    .where(eq(cityContactsTable.motorista, motorista))
    .orderBy(asc(cityContactsTable.city));
  res.json(contacts);
});

// GET /city-contacts/:city — single city
router.get("/city-contacts/:city", requireAuth, async (req, res): Promise<void> => {
  const city = decodeURIComponent(Array.isArray(req.params.city) ? req.params.city[0] : req.params.city);
  const [contact] = await db
    .select()
    .from(cityContactsTable)
    .where(eq(cityContactsTable.city, city));
  if (!contact) {
    res.status(404).json({ error: "Contato não encontrado" });
    return;
  }
  res.json(contact);
});

// POST /city-contacts — upsert by city
router.post("/city-contacts", requireAuth, async (req, res): Promise<void> => {
  const { city, responsavel, contato, entregador, motorista, contatoMotorista, conferente, operacao } = req.body;
  if (!city || !responsavel) {
    res.status(400).json({ error: "city e responsavel são obrigatórios" });
    return;
  }
  const [existing] = await db.select().from(cityContactsTable).where(eq(cityContactsTable.city, city));
  const payload = {
    responsavel,
    contato: contato ?? "",
    entregador: entregador ?? "",
    motorista: motorista ?? "",
    contatoMotorista: contatoMotorista ?? "",
    conferente: conferente ?? "",
    operacao: operacao ?? "",
  };
  if (existing) {
    const [updated] = await db
      .update(cityContactsTable)
      .set(payload)
      .where(eq(cityContactsTable.city, city))
      .returning();
    res.json(updated);
    return;
  }
  const [created] = await db
    .insert(cityContactsTable)
    .values({ city, ...payload })
    .returning();
  res.status(201).json(created);
});

// PUT /city-contacts/:id — full update
router.put("/city-contacts/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { city, responsavel, contato, entregador, motorista, contatoMotorista, conferente, operacao } = req.body;
  if (!city || !responsavel) {
    res.status(400).json({ error: "city e responsavel são obrigatórios" });
    return;
  }
  const [updated] = await db
    .update(cityContactsTable)
    .set({ city, responsavel, contato: contato ?? "", entregador: entregador ?? "", motorista: motorista ?? "", contatoMotorista: contatoMotorista ?? "", conferente: conferente ?? "", operacao: operacao ?? "" })
    .where(eq(cityContactsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Contato não encontrado" });
    return;
  }
  res.json(updated);
});

// DELETE /city-contacts/:id
router.delete("/city-contacts/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [deleted] = await db
    .delete(cityContactsTable)
    .where(eq(cityContactsTable.id, id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Contato não encontrado" });
    return;
  }
  res.sendStatus(204);
});

export default router;
