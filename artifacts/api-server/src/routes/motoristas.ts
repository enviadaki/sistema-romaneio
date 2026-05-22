import { Router, type IRouter } from "express";
import { asc } from "drizzle-orm";
import { db, motoristasTable, conferentesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// GET /motoristas
router.get("/motoristas", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(motoristasTable).orderBy(asc(motoristasTable.nome));
  res.json(rows);
});

// GET /conferentes
router.get("/conferentes", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(conferentesTable).orderBy(asc(conferentesTable.nome));
  res.json(rows);
});

export default router;
