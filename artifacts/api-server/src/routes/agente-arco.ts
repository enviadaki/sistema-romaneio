import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, arcoEnviosTable, arcoEnvioItensTable } from "@workspace/db";
import {
  AgenteProximoEnvioResponse,
  AgenteHeartbeatEnvioParams,
  AgenteHeartbeatEnvioResponse,
  AgenteResultadoEnvioParams,
  AgenteResultadoEnvioBody,
  GetArcoEnvioResponse,
} from "@workspace/api-zod";
import { requireAgenteToken } from "../middlewares/requireAgenteToken";
import { claimNextEnvio, markHeartbeat } from "../modules/arco-envios/claim";
import { applyResultado } from "../modules/arco-envios/resultado";
import { mapEnvioComItens } from "../modules/arco-envios/mappers";
import { logAuditEvent } from "../modules/audit/log";

const router: IRouter = Router();

router.post("/agente/envios/proximo", requireAgenteToken, async (_req, res): Promise<void> => {
  const envio = await claimNextEnvio();
  if (!envio) {
    res.status(204).end();
    return;
  }

  const itens = await db
    .select({ codigo: arcoEnvioItensTable.codigo })
    .from(arcoEnvioItensTable)
    .where(eq(arcoEnvioItensTable.envioId, envio.id));

  res.json(
    AgenteProximoEnvioResponse.parse({
      id: envio.id,
      operation: envio.operation,
      romaneioLabel: envio.romaneioLabel,
      romaneioData: envio.romaneioData,
      codigos: itens.map((i) => i.codigo),
    }),
  );
});

router.post("/agente/envios/:id/heartbeat", requireAgenteToken, async (req, res): Promise<void> => {
  const params = AgenteHeartbeatEnvioParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const ok = await markHeartbeat(params.data.id);
  if (!ok) {
    res.status(404).json({ error: "Envio não encontrado ou não está em andamento." });
    return;
  }
  res.json(AgenteHeartbeatEnvioResponse.parse({ ok: true }));
});

router.post("/agente/envios/:id/resultado", requireAgenteToken, async (req, res): Promise<void> => {
  const params = AgenteResultadoEnvioParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = AgenteResultadoEnvioBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const applied = await applyResultado(params.data.id, body.data);
  if (!applied) {
    res.status(404).json({ error: "Envio não encontrado ou não está em andamento/interrompido." });
    return;
  }

  const [envio] = await db.select().from(arcoEnviosTable).where(eq(arcoEnviosTable.id, params.data.id)).limit(1);
  const itens = await db
    .select()
    .from(arcoEnvioItensTable)
    .where(eq(arcoEnvioItensTable.envioId, params.data.id));

  logAuditEvent({
    eventType: "arco_envio_resultado",
    operation: envio!.operation,
    recordId: envio!.id,
    details: `status=${applied.status}${body.data.erroGeral ? ` erroGeral=${body.data.erroGeral}` : ""}`,
  });

  res.json(GetArcoEnvioResponse.parse(mapEnvioComItens(envio!, itens)));
});

export default router;
