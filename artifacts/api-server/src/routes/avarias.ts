import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, avariasTable, avariaCategories, type AvariaCategory } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOperationAccess } from "../middlewares/requireOperationAccess";
import { normalizeTbrCode } from "../modules/amazon/tbr";

// Passo 6 do plano da AMAZON: registro manual de avaria — ação separada da
// bipagem normal, não altera o status do pacote original. Decisões do
// usuário: campos extras = categoria + descrição + foto; permite registrar
// mesmo se o código não estiver cadastrado (não bloqueia).
const router: IRouter = Router();

function isValidCategory(value: unknown): value is AvariaCategory {
  return typeof value === "string" && (avariaCategories as readonly string[]).includes(value);
}

// Limite de tamanho pra foto em base64 — sem storage de arquivo de verdade
// neste projeto, a imagem já vem comprimida do navegador; isso é só uma
// trava de sanidade contra um payload gigante por engano.
const MAX_PHOTO_BASE64_LENGTH = 2_000_000; // ~1.5MB de imagem original

router.post("/avarias", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  const operation = (req.body?.operation as string | undefined)?.trim() || "LOGGI";
  // Mesma normalização usada em /scans e /packages para AMAZON (maiúsculas,
  // sem espaços) — sem isso, um código digitado em caixa diferente da
  // registrada no cadastro do pacote não bate na comparação exata usada
  // pelo /stats para tirar o pacote da lista de pendentes.
  let trackingNumber = (req.body?.trackingNumber as string | undefined)?.trim();
  if (operation === "AMAZON" && trackingNumber) {
    trackingNumber = normalizeTbrCode(trackingNumber);
  }
  const category = req.body?.category;
  const description = (req.body?.description as string | undefined)?.trim() || null;
  const photo = (req.body?.photo as string | undefined) || null;
  const confirm = req.body?.confirm === true;
  const sessionIdRaw = req.body?.sessionId;
  const sessionId =
    typeof sessionIdRaw === "number" && Number.isFinite(sessionIdRaw) ? sessionIdRaw : null;

  if (!trackingNumber) {
    res.status(400).json({ error: "trackingNumber é obrigatório" });
    return;
  }
  if (!isValidCategory(category)) {
    res.status(400).json({ error: `category inválida. Use uma de: ${avariaCategories.join(", ")}` });
    return;
  }
  if (photo && photo.length > MAX_PHOTO_BASE64_LENGTH) {
    res.status(400).json({ error: "Foto muito grande. Tente novamente com uma imagem menor." });
    return;
  }

  // "Avisa se já existir avaria para aquele código" — não bloqueia, só avisa
  // (a menos que o operador já tenha confirmado que quer registrar mesmo
  // assim, via confirm=true).
  if (!confirm) {
    const [existing] = await db
      .select()
      .from(avariasTable)
      .where(and(eq(avariasTable.trackingNumber, trackingNumber), eq(avariasTable.operation, operation)))
      .orderBy(desc(avariasTable.createdAt))
      .limit(1);

    if (existing) {
      res.status(409).json({
        error: "Já existe uma avaria registrada para este código",
        existing: {
          category: existing.category,
          createdAt: existing.createdAt.toISOString(),
          registeredBy: existing.registeredBy,
        },
      });
      return;
    }
  }

  const userFullName = (req as any).userFullName ?? null;

  const [created] = await db
    .insert(avariasTable)
    .values({
      trackingNumber,
      operation,
      sessionId,
      category,
      description,
      photo,
      registeredBy: userFullName,
    })
    .returning();

  res.status(201).json({
    id: created.id,
    trackingNumber: created.trackingNumber,
    operation: created.operation,
    category: created.category,
    description: created.description,
    hasPhoto: !!created.photo,
    status: created.status,
    registeredBy: created.registeredBy,
    createdAt: created.createdAt.toISOString(),
  });
});

// GET /avarias?operation=Y — lista enxuta (sem foto/descrição) usada pra
// tirar da "Faltantes (Esperados)" do Pré-Sorter qualquer código que já
// tenha avaria registrada — essa lista é calculada no cliente comparando
// pacotes x bipagens de hoje, então precisa também saber quais têm avaria.
router.get("/avarias", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  const operation = (req.query.operation as string | undefined)?.trim() || "LOGGI";

  const rows = await db
    .select({
      id: avariasTable.id,
      trackingNumber: avariasTable.trackingNumber,
      category: avariasTable.category,
      createdAt: avariasTable.createdAt,
    })
    .from(avariasTable)
    .where(eq(avariasTable.operation, operation))
    .orderBy(desc(avariasTable.createdAt));

  res.json(
    rows.map((r) => ({
      id: r.id,
      trackingNumber: r.trackingNumber,
      category: r.category,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

export default router;
