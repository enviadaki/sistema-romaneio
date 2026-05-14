import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, packagesTable, deliveriesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/deliveries", requireAuth, async (req, res): Promise<void> => {
  const route = (req.query.route as string | undefined)?.trim();
  const date = (req.query.date as string | undefined)?.trim();

  const conditions = [];
  if (route) conditions.push(eq(deliveriesTable.route, route));
  if (date) conditions.push(eq(deliveriesTable.deliveryDate, date));

  const rows = await db
    .select()
    .from(deliveriesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(deliveriesTable.deliveredAt);

  res.json(
    rows.map((d) => ({
      id: d.id,
      trackingNumber: d.trackingNumber,
      city: d.city,
      route: d.route,
      deliveryDate: d.deliveryDate,
      deliveredBy: d.deliveredBy ?? null,
      deliveredAt: d.deliveredAt.toISOString(),
    }))
  );
});

router.post("/deliveries", requireAuth, async (req, res): Promise<void> => {
  const trackingNumber = (req.body?.trackingNumber as string | undefined)?.trim();
  const route = (req.body?.route as string | undefined)?.trim();
  if (!trackingNumber || !route) {
    res.status(400).json({ error: "trackingNumber e route são obrigatórios" });
    return;
  }

  // Look up the package to get city
  const [pkg] = await db
    .select()
    .from(packagesTable)
    .where(eq(packagesTable.trackingNumber, trackingNumber))
    .limit(1);

  if (!pkg) {
    res.status(404).json({ error: "Pacote não encontrado no sistema" });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const deliveredBy = (req as any).auth?.sessionClaims?.email as string | undefined
    ?? (req as any).auth?.userId ?? null;

  try {
    const [delivery] = await db
      .insert(deliveriesTable)
      .values({
        trackingNumber,
        city: pkg.city,
        route,
        deliveryDate: today,
        deliveredBy: deliveredBy ?? null,
      })
      .returning();

    res.status(201).json({
      id: delivery.id,
      trackingNumber: delivery.trackingNumber,
      city: delivery.city,
      route: delivery.route,
      deliveryDate: delivery.deliveryDate,
      deliveredBy: delivery.deliveredBy ?? null,
      deliveredAt: delivery.deliveredAt.toISOString(),
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Entrega já confirmada para este pacote hoje" });
    } else {
      throw err;
    }
  }
});

router.delete("/deliveries/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [deleted] = await db
    .delete(deliveriesTable)
    .where(eq(deliveriesTable.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Confirmação não encontrada" });
    return;
  }

  res.sendStatus(204);
});

// GET /deliveries/summary?route=XXX&date=YYYY-MM-DD
// Returns packages for a route + which ones are confirmed delivered today
router.get("/deliveries/summary", requireAuth, async (req, res): Promise<void> => {
  const route = (req.query.route as string | undefined)?.trim();
  const date = (req.query.date as string | undefined)?.trim();

  if (!route || !date) {
    res.status(400).json({ error: "route e date são obrigatórios" });
    return;
  }

  // Get confirmed deliveries for this route+date
  const confirmed = await db
    .select()
    .from(deliveriesTable)
    .where(
      and(
        eq(deliveriesTable.route, route),
        eq(deliveriesTable.deliveryDate, date)
      )
    );

  res.json({
    route,
    date,
    confirmed: confirmed.map((d) => ({
      id: d.id,
      trackingNumber: d.trackingNumber,
      city: d.city,
      deliveredBy: d.deliveredBy ?? null,
      deliveredAt: d.deliveredAt.toISOString(),
    })),
  });
});

export default router;
