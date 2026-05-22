import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, cityContactsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/city-contacts", requireAuth, async (req, res): Promise<void> => {
  const contacts = await db.select().from(cityContactsTable).orderBy(cityContactsTable.city);
  res.json(contacts);
});

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

router.post("/city-contacts", requireAuth, async (req, res): Promise<void> => {
  const { city, responsavel, contato } = req.body;
  if (!city || !responsavel) {
    res.status(400).json({ error: "city e responsavel são obrigatórios" });
    return;
  }
  const [existing] = await db
    .select()
    .from(cityContactsTable)
    .where(eq(cityContactsTable.city, city));
  if (existing) {
    const [updated] = await db
      .update(cityContactsTable)
      .set({ responsavel, contato: contato ?? "" })
      .where(eq(cityContactsTable.city, city))
      .returning();
    res.json(updated);
    return;
  }
  const [created] = await db
    .insert(cityContactsTable)
    .values({ city, responsavel, contato: contato ?? "" })
    .returning();
  res.status(201).json(created);
});

router.put("/city-contacts/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { city, responsavel, contato } = req.body;
  if (!city || !responsavel) {
    res.status(400).json({ error: "city e responsavel são obrigatórios" });
    return;
  }
  const [updated] = await db
    .update(cityContactsTable)
    .set({ city, responsavel, contato: contato ?? "" })
    .where(eq(cityContactsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Contato não encontrado" });
    return;
  }
  res.json(updated);
});

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
