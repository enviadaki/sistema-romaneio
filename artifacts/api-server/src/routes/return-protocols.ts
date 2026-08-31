import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  packagesTable,
  returnProtocolItemsTable,
  returnProtocolsTable,
} from "@workspace/db";
import {
  CancelReturnProtocolBody,
  CancelReturnProtocolParams,
  CancelReturnProtocolResponse,
  CreateReturnProtocolBody,
  GetReturnProtocolParams,
  GetReturnProtocolResponse,
  ListReturnProtocolsQueryParams,
  ListReturnProtocolsResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

type ProtocolWithItems = typeof returnProtocolsTable.$inferSelect & {
  items: (typeof returnProtocolItemsTable.$inferSelect)[];
};

function protocolLabel(numero: number, dataDevolucao: string): string {
  return `DEV-${dataDevolucao.slice(0, 4)}-${String(numero).padStart(6, "0")}`;
}

function buildProtocolResponse(protocol: ProtocolWithItems) {
  return {
    id: protocol.id,
    numero: protocol.numero,
    status: protocol.status,
    operacao: protocol.operacao,
    motorista: protocol.motorista,
    conferente: protocol.conferente,
    dataDevolucao: protocol.dataDevolucao,
    motivo: protocol.motivo,
    observacoes: protocol.observacoes ?? null,
    cancelamentoMotivo: protocol.cancelamentoMotivo ?? null,
    createdAt: protocol.createdAt.toISOString(),
    items: protocol.items.map((item) => ({
      id: item.id,
      protocolId: item.protocolId,
      tipo: item.tipo,
      referencia: item.referencia,
      descricao: item.descricao ?? null,
      operacao: item.operacao ?? null,
      cidade: item.cidade ?? null,
      rota: item.rota ?? null,
      prazo: item.prazo ?? null,
      quantidadeVolumes: item.quantidadeVolumes,
      observacao: item.observacao ?? null,
    })),
  };
}

async function getProtocol(id: number): Promise<ProtocolWithItems | undefined> {
  const [protocol] = await db
    .select()
    .from(returnProtocolsTable)
    .where(eq(returnProtocolsTable.id, id));
  if (!protocol) return undefined;

  const items = await db
    .select()
    .from(returnProtocolItemsTable)
    .where(eq(returnProtocolItemsTable.protocolId, id));
  return { ...protocol, items };
}

async function getNextNumero(): Promise<number> {
  const [last] = await db
    .select({ numero: returnProtocolsTable.numero })
    .from(returnProtocolsTable)
    .orderBy(desc(returnProtocolsTable.numero))
    .limit(1);
  return last ? last.numero + 1 : 1;
}

router.get("/return-protocols", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListReturnProtocolsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const filters = parsed.data;
  const protocols = await db
    .select()
    .from(returnProtocolsTable)
    .orderBy(desc(returnProtocolsTable.createdAt));

  const allItems = await db
    .select()
    .from(returnProtocolItemsTable)
    .orderBy(returnProtocolItemsTable.id);
  const itemsByProtocol = new Map<number, (typeof allItems)[number][]>();
  for (const item of allItems) {
    const current = itemsByProtocol.get(item.protocolId) ?? [];
    current.push(item);
    itemsByProtocol.set(item.protocolId, current);
  }

  const filtered = protocols.filter((protocol) => {
    const items = itemsByProtocol.get(protocol.id) ?? [];
    const label = protocolLabel(protocol.numero, protocol.dataDevolucao);
    const search = filters.protocolo?.toLowerCase();
    const code = filters.code?.toLowerCase();
    if (filters.dateFrom && protocol.dataDevolucao < filters.dateFrom) return false;
    if (filters.dateTo && protocol.dataDevolucao > filters.dateTo) return false;
    if (filters.operation && protocol.operacao !== filters.operation) return false;
    if (filters.motorista && protocol.motorista !== filters.motorista) return false;
    if (filters.conferente && protocol.conferente !== filters.conferente) return false;
    if (filters.motivo && protocol.motivo !== filters.motivo) return false;
    if (filters.status && protocol.status !== filters.status) return false;
    if (search && !label.toLowerCase().includes(search) && !String(protocol.numero).includes(search)) {
      return false;
    }
    if (code && !items.some((item) => item.referencia.toLowerCase().includes(code))) return false;
    return true;
  });

  res.json(
    ListReturnProtocolsResponse.parse(
      filtered.map((protocol) =>
        buildProtocolResponse({ ...protocol, items: itemsByProtocol.get(protocol.id) ?? [] }),
      ),
    ),
  );
});

router.get("/return-protocols/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetReturnProtocolParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const protocol = await getProtocol(params.data.id);
  if (!protocol) {
    res.status(404).json({ error: "Protocolo não encontrado" });
    return;
  }
  res.json(GetReturnProtocolResponse.parse(buildProtocolResponse(protocol)));
});

router.post("/return-protocols", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateReturnProtocolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const input = parsed.data;
  const numero = await getNextNumero();
  const protocol = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(returnProtocolsTable)
      .values({
        numero,
        status: "EMITIDO",
        operacao: input.operacao,
        motorista: input.motorista,
        conferente: input.conferente,
        dataDevolucao: input.dataDevolucao,
        motivo: input.motivo,
        observacoes: input.observacoes ?? null,
      })
      .returning();

    const createdItems = [];
    for (const item of input.items) {
      const [createdItem] = await tx
        .insert(returnProtocolItemsTable)
        .values({
          protocolId: created.id,
          tipo: item.tipo,
          referencia: item.referencia,
          descricao: item.descricao ?? null,
          operacao: item.operacao ?? null,
          cidade: item.cidade ?? null,
          rota: item.rota ?? null,
          prazo: item.prazo ?? null,
          quantidadeVolumes: item.quantidadeVolumes,
          observacao: item.observacao ?? null,
        })
        .returning();
      createdItems.push(createdItem);
    }
    return { ...created, items: createdItems };
  });

  res.status(201).json(GetReturnProtocolResponse.parse(buildProtocolResponse(protocol)));
});

router.patch("/return-protocols/:id/cancel", requireAuth, async (req, res): Promise<void> => {
  const params = CancelReturnProtocolParams.safeParse(req.params);
  const parsed = CancelReturnProtocolBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(returnProtocolsTable)
    .where(eq(returnProtocolsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Protocolo não encontrado" });
    return;
  }
  if (existing.status === "CANCELADO") {
    res.status(400).json({ error: "Este protocolo já está cancelado" });
    return;
  }

  const [updated] = await db
    .update(returnProtocolsTable)
    .set({ status: "CANCELADO", cancelamentoMotivo: parsed.data.motivo })
    .where(and(eq(returnProtocolsTable.id, params.data.id), eq(returnProtocolsTable.status, existing.status)))
    .returning();
  const items = await db
    .select()
    .from(returnProtocolItemsTable)
    .where(eq(returnProtocolItemsTable.protocolId, params.data.id));
  res.json(
    CancelReturnProtocolResponse.parse(
      buildProtocolResponse({ ...updated, items }),
    ),
  );
});

export default router;