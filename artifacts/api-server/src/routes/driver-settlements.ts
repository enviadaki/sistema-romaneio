import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, driverSettlementsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function toNumericField(val: unknown): string {
  if (val === undefined || val === null || val === "") return "0";
  const n = typeof val === "string" ? parseFloat(val.replace(",", ".")) : Number(val);
  return Number.isFinite(n) ? String(n) : "0";
}

// GET /driver-settlements?competencia=YYYY-MM
router.get("/driver-settlements", requireAuth, async (req, res): Promise<void> => {
  const { competencia } = req.query as Record<string, string>;
  const rows = await db
    .select()
    .from(driverSettlementsTable)
    .where(competencia ? eq(driverSettlementsTable.competencia, competencia) : undefined)
    .orderBy(asc(driverSettlementsTable.motorista));
  res.json(rows);
});

// POST /driver-settlements
router.post("/driver-settlements", requireAuth, async (req, res): Promise<void> => {
  const {
    motorista, competencia, abastecimento, totalDesconto, fechamentoAnterior,
    ajudante, dezPorCentoAMais, viagem, saldo, chavePix, favorecido,
  } = req.body as Record<string, unknown>;

  if (!motorista || typeof motorista !== "string" || !motorista.trim()) {
    res.status(400).json({ error: "Motorista é obrigatório" });
    return;
  }
  if (!competencia || typeof competencia !== "string" || !/^\d{4}-\d{2}$/.test(competencia)) {
    res.status(400).json({ error: "Competência é obrigatória no formato AAAA-MM" });
    return;
  }

  const [existing] = await db
    .select({ id: driverSettlementsTable.id })
    .from(driverSettlementsTable)
    .where(and(eq(driverSettlementsTable.motorista, motorista.trim()), eq(driverSettlementsTable.competencia, competencia)))
    .limit(1);
  if (existing) {
    res.status(409).json({ error: "Já existe um fechamento deste motorista para esta competência", id: existing.id });
    return;
  }

  const [row] = await db
    .insert(driverSettlementsTable)
    .values({
      motorista: motorista.trim(),
      competencia,
      abastecimento: toNumericField(abastecimento),
      totalDesconto: toNumericField(totalDesconto),
      fechamentoAnterior: toNumericField(fechamentoAnterior),
      ajudante: toNumericField(ajudante),
      dezPorCentoAMais: toNumericField(dezPorCentoAMais),
      viagem: toNumericField(viagem),
      saldo: toNumericField(saldo),
      chavePix: typeof chavePix === "string" ? chavePix.trim() : "",
      favorecido: typeof favorecido === "string" ? favorecido.trim() : "",
    })
    .returning();
  res.status(201).json(row);
});

// PUT /driver-settlements/:id
router.put("/driver-settlements/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const {
    abastecimento, totalDesconto, fechamentoAnterior,
    ajudante, dezPorCentoAMais, viagem, saldo, chavePix, favorecido,
  } = req.body as Record<string, unknown>;

  const [row] = await db
    .update(driverSettlementsTable)
    .set({
      abastecimento: toNumericField(abastecimento),
      totalDesconto: toNumericField(totalDesconto),
      fechamentoAnterior: toNumericField(fechamentoAnterior),
      ajudante: toNumericField(ajudante),
      dezPorCentoAMais: toNumericField(dezPorCentoAMais),
      viagem: toNumericField(viagem),
      saldo: toNumericField(saldo),
      chavePix: typeof chavePix === "string" ? chavePix.trim() : "",
      favorecido: typeof favorecido === "string" ? favorecido.trim() : "",
      updatedAt: new Date(),
    })
    .where(eq(driverSettlementsTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Fechamento não encontrado" }); return; }
  res.json(row);
});

// DELETE /driver-settlements/:id
router.delete("/driver-settlements/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [row] = await db.delete(driverSettlementsTable).where(eq(driverSettlementsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Fechamento não encontrado" }); return; }
  res.json({ success: true });
});

export default router;
