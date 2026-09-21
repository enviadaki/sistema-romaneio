import { Router, type IRouter } from "express";
import { db, cityCorrectionsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { normalizeCityKey } from "../modules/amazon/filial";
import { logAuditEvent } from "../modules/audit/log";

const router: IRouter = Router();

// Pedido do usuário (ver conversa sobre "Po&ccedil" no arquivo de
// recebimento): quando a tela de Cadastro encontra uma cidade que não bate
// com nenhuma cidade já conhecida, ela primeiro tenta resolver sozinha
// consultando o CEP do pacote (ViaCEP, serviço público, sem necessidade de
// chave) antes de pedir correção manual. Essas duas rotas dão suporte a
// esse fluxo:
//
// - GET  /city-corrections       — devolve as correções já aprendidas (uma
//   extensão, gravada em banco, do dicionário estático CITY_CORRECTIONS do
//   frontend), pra aplicar automaticamente em importações futuras.
// - POST /city-corrections       — grava uma correção nova (manual ou vinda
//   do CEP), pra não perguntar de novo da próxima vez que aparecer o mesmo
//   texto bruto.
// - GET  /cep-lookup/:cep        — proxy pro ViaCEP; devolve a cidade oficial
//   daquele CEP, ou 404 se o CEP for inválido/não encontrado.

router.get("/city-corrections", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({ rawKey: cityCorrectionsTable.rawKey, correctedCity: cityCorrectionsTable.correctedCity })
    .from(cityCorrectionsTable);
  res.json(rows);
});

router.post("/city-corrections", requireAuth, async (req, res): Promise<void> => {
  const rawCity = (req.body?.rawCity as string | undefined)?.trim();
  const correctedCity = (req.body?.correctedCity as string | undefined)?.trim();
  const source = (req.body?.source as string | undefined) === "cep_lookup" ? "cep_lookup" : "manual";

  if (!rawCity || !correctedCity) {
    res.status(400).json({ error: "rawCity e correctedCity são obrigatórios." });
    return;
  }

  const rawKey = normalizeCityKey(rawCity);
  // Corrigir pra si mesma (ex.: usuário só confirmou que "Iguai" está certo)
  // não tem valor nenhum guardado — evita poluir a tabela.
  if (rawKey === normalizeCityKey(correctedCity)) {
    res.status(200).json({ rawKey, correctedCity, skipped: true });
    return;
  }

  const [saved] = await db
    .insert(cityCorrectionsTable)
    .values({ rawKey, correctedCity, source })
    .onConflictDoUpdate({
      target: cityCorrectionsTable.rawKey,
      set: { correctedCity, source },
    })
    .returning();

  const userFullName = (req as any).userFullName ?? null;
  logAuditEvent({
    eventType: "city_correction_added",
    performedBy: userFullName,
    details: `'${rawCity}' -> '${correctedCity}' (${source})`,
  });

  res.status(201).json(saved);
});

// CEP pode chegar formatado (12345-678), com espaço, ou sem os 8 dígitos —
// mesmo tratamento tolerante já usado em modules/amazon/rota.ts.
function normalizeCep(value: string): string {
  return value.replace(/\D/g, "").padStart(8, "0").slice(-8);
}

interface ViaCepResponse {
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

router.get("/cep-lookup/:cep", requireAuth, async (req, res): Promise<void> => {
  const cep = normalizeCep((req.params.cep as string | undefined) ?? "");
  if (cep.length !== 8 || cep === "00000000") {
    res.status(400).json({ error: "CEP inválido." });
    return;
  }

  try {
    // ViaCEP é público e não exige chave — mesmo serviço amplamente usado
    // pra resolver CEP -> cidade no Brasil. Timeout curto pra nunca travar
    // a tela de importação esperando uma rede externa lenta/fora do ar.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let response: Response;
    try {
      response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      res.status(502).json({ error: "Falha ao consultar o CEP." });
      return;
    }

    const data = (await response.json()) as ViaCepResponse;
    if (data.erro || !data.localidade) {
      res.status(404).json({ error: "CEP não encontrado." });
      return;
    }

    res.json({ city: data.localidade, uf: data.uf ?? null });
  } catch {
    res.status(502).json({ error: "Falha ao consultar o CEP." });
  }
});

export default router;
