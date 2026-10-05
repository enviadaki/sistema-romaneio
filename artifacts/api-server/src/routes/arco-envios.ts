import { Router, type IRouter } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, arcoEnviosTable, arcoEnvioItensTable } from "@workspace/db";
import {
  CreateArcoEnvioBody,
  ListArcoEnviosQueryParams,
  ListArcoEnviosResponse,
  GetArcoEnvioParams,
  GetArcoEnvioResponse,
  ReenviarArcoEnvioFalhasParams,
  CancelarArcoEnvioParams,
  CancelarArcoEnvioResponse,
  GetArcoAgenteStatusResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOperationAccess, isOperationAllowed } from "../middlewares/requireOperationAccess";
import { resolveRomaneioItems } from "../modules/romaneio/resolve";
import { resolveRomaneioEscopo, resolveRomaneioLabel } from "../modules/arco-envios/escopo";
import { mapEnvio, mapEnvioComItens } from "../modules/arco-envios/mappers";
import { getAgenteStatus } from "../modules/arco-envios/agente-status";
import { logAuditEvent } from "../modules/audit/log";

const router: IRouter = Router();

const ACTIVE_STATUSES = ["pendente", "em_andamento", "concluido"] as const;

async function loadEnvioComItens(id: number) {
  const [envio] = await db.select().from(arcoEnviosTable).where(eq(arcoEnviosTable.id, id)).limit(1);
  if (!envio) return null;
  const itens = await db.select().from(arcoEnvioItensTable).where(eq(arcoEnvioItensTable.envioId, id));
  return { envio, itens };
}

// Importante: rota literal antes de "/arco-envios/:id" pra não ser
// capturada pelo parâmetro :id.
router.get("/arco-envios/agente-status", requireAuth, async (_req, res): Promise<void> => {
  const status = await getAgenteStatus();
  res.json(
    GetArcoAgenteStatusResponse.parse({
      online: status.online,
      ultimoVistoEm: status.ultimoVistoEm?.toISOString() ?? null,
    }),
  );
});

router.get("/arco-envios", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListArcoEnviosQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { operation, status, limit } = parsed.data;

  const conditions = [
    operation ? eq(arcoEnviosTable.operation, operation) : undefined,
    status ? eq(arcoEnviosTable.status, status) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);

  const allowedOperations = (req as any).allowedOperations as string[] | undefined;
  if (allowedOperations?.length) {
    conditions.push(inArray(arcoEnviosTable.operation, allowedOperations));
  }

  const rows = await db
    .select()
    .from(arcoEnviosTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(arcoEnviosTable.criadoEm))
    .limit(limit ?? 50);

  res.json(ListArcoEnviosResponse.parse(rows.map(mapEnvio)));
});

router.post("/arco-envios", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  const parsed = CreateArcoEnvioBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = parsed.data;
  const operation = input.operation?.trim() || "LOGGI";

  // O agente só bipa no site da Loggi — não faz sentido pra AMAZON.
  if (operation !== "LOGGI") {
    res.status(400).json({ error: "A integração com o ARCO está disponível apenas para a operação LOGGI." });
    return;
  }

  const escopo = resolveRomaneioEscopo(input);
  if (!escopo) {
    res.status(400).json({ error: "Informe city, cities ou rota." });
    return;
  }
  const date = input.date.trim();
  const label = resolveRomaneioLabel(escopo, input.label);

  const [existing] = await db
    .select({ id: arcoEnviosTable.id })
    .from(arcoEnviosTable)
    .where(
      and(
        eq(arcoEnviosTable.operation, operation),
        eq(arcoEnviosTable.romaneioData, date),
        eq(arcoEnviosTable.romaneioEscopoTipo, escopo.tipo),
        eq(arcoEnviosTable.romaneioEscopoValor, escopo.valor),
        inArray(arcoEnviosTable.status, ACTIVE_STATUSES),
      ),
    )
    .limit(1);

  if (existing && !input.forcar) {
    res.status(409).json({
      error: "Já existe um envio para este romaneio. Use forcar=true para enviar mesmo assim.",
      envioExistenteId: existing.id,
    });
    return;
  }

  const itens = await resolveRomaneioItems({
    date,
    operation,
    rota: escopo.tipo === "rota" ? escopo.rota : undefined,
    cities: escopo.tipo === "cidade" ? escopo.cities : undefined,
  });

  if (itens.length === 0) {
    res.status(400).json({ error: "Nenhum pacote bipado para este romaneio." });
    return;
  }

  const codigos = [...new Set(itens.map((i) => i.trackingNumber))];
  const criadoPor = (req as any).userFullName ?? null;

  const result = await db.transaction(async (tx) => {
    const [envio] = await tx
      .insert(arcoEnviosTable)
      .values({
        operation,
        romaneioData: date,
        romaneioEscopoTipo: escopo.tipo,
        romaneioEscopoValor: escopo.valor,
        romaneioLabel: label,
        status: "pendente",
        criadoPor,
      })
      .returning();

    const insertedItens = await tx
      .insert(arcoEnvioItensTable)
      .values(codigos.map((codigo) => ({ envioId: envio.id, codigo, status: "pendente" as const })))
      .returning();

    return { envio, itens: insertedItens };
  });

  logAuditEvent({
    eventType: "arco_envio_criado",
    operation,
    recordId: result.envio.id,
    performedBy: criadoPor,
    details: `${label} — ${codigos.length} pacote(s)`,
  });

  res.status(201).json(GetArcoEnvioResponse.parse(mapEnvioComItens(result.envio, result.itens)));
});

router.get("/arco-envios/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetArcoEnvioParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const loaded = await loadEnvioComItens(params.data.id);
  if (!loaded) {
    res.status(404).json({ error: "Envio não encontrado" });
    return;
  }
  res.json(GetArcoEnvioResponse.parse(mapEnvioComItens(loaded.envio, loaded.itens)));
});

router.post("/arco-envios/:id/reenviar-falhas", requireAuth, async (req, res): Promise<void> => {
  const params = ReenviarArcoEnvioFalhasParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const loaded = await loadEnvioComItens(params.data.id);
  if (!loaded) {
    res.status(404).json({ error: "Envio não encontrado" });
    return;
  }
  const { envio: origem, itens: origemItens } = loaded;

  if (!isOperationAllowed(req, origem.operation)) {
    res.status(403).json({ error: `Acesso negado para a operação '${origem.operation}'.` });
    return;
  }

  const falhas = origemItens.filter((i) => i.status === "erro" || i.status === "nao_processado");
  if (falhas.length === 0) {
    res.status(400).json({ error: "Este envio não tem itens com erro ou não processados." });
    return;
  }

  const criadoPor = (req as any).userFullName ?? null;

  const result = await db.transaction(async (tx) => {
    const [envio] = await tx
      .insert(arcoEnviosTable)
      .values({
        operation: origem.operation,
        romaneioData: origem.romaneioData,
        romaneioEscopoTipo: origem.romaneioEscopoTipo,
        romaneioEscopoValor: origem.romaneioEscopoValor,
        romaneioLabel: origem.romaneioLabel,
        status: "pendente",
        criadoPor,
        envioOrigemId: origem.id,
      })
      .returning();

    const insertedItens = await tx
      .insert(arcoEnvioItensTable)
      .values(falhas.map((i) => ({ envioId: envio.id, codigo: i.codigo, status: "pendente" as const })))
      .returning();

    return { envio, itens: insertedItens };
  });

  logAuditEvent({
    eventType: "arco_envio_criado",
    operation: origem.operation,
    recordId: result.envio.id,
    performedBy: criadoPor,
    details: `Reenvio de falhas do envio #${origem.id} — ${falhas.length} pacote(s)`,
  });

  res.status(201).json(GetArcoEnvioResponse.parse(mapEnvioComItens(result.envio, result.itens)));
});

router.post("/arco-envios/:id/cancelar", requireAuth, async (req, res): Promise<void> => {
  const params = CancelarArcoEnvioParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [updated] = await db
    .update(arcoEnviosTable)
    .set({ status: "cancelado", finalizadoEm: new Date() })
    .where(and(eq(arcoEnviosTable.id, params.data.id), eq(arcoEnviosTable.status, "pendente")))
    .returning();

  if (updated) {
    res.json(CancelarArcoEnvioResponse.parse(mapEnvio(updated)));
    return;
  }

  const [existing] = await db
    .select()
    .from(arcoEnviosTable)
    .where(eq(arcoEnviosTable.id, params.data.id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Envio não encontrado" });
    return;
  }
  res.status(409).json({ error: "Envio não está mais pendente e não pode ser cancelado." });
});

export default router;
