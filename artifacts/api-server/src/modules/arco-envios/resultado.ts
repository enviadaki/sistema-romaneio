import { and, eq } from "drizzle-orm";
import { db, arcoEnviosTable, arcoEnvioItensTable, type ArcoEnvioStatus, type ArcoEnvioItemStatus } from "@workspace/db";

export interface ResultadoItemInput {
  codigo: string;
  ok: boolean;
  erro?: string;
}

export interface ItemResultado {
  codigo: string;
  status: ArcoEnvioItemStatus;
  erro: string | null;
}

export interface EnvioResultadoComputado {
  envioStatus: ArcoEnvioStatus;
  itens: ItemResultado[];
}

// Tabela de decisão pedida: concluido (tudo ok e sem erro_geral),
// concluido_com_erros (alguns erros), falhou (nenhum ok ou erro_geral de
// abertura — inclui o caso BOTOES_FINAIS). Função pura: não toca o banco,
// só decide o status a partir dos códigos esperados e do que o agente
// reportou — isolada pra ser testável sem precisar de Postgres.
export function computeEnvioResultado(params: {
  codigosEsperados: string[];
  itensReportados: ResultadoItemInput[];
  erroGeral?: string;
}): EnvioResultadoComputado {
  const reportedByCodigo = new Map(params.itensReportados.map((item) => [item.codigo, item]));

  const itens: ItemResultado[] = params.codigosEsperados.map((codigo) => {
    const reported = reportedByCodigo.get(codigo);
    if (!reported) {
      return { codigo, status: "nao_processado", erro: null };
    }
    return {
      codigo,
      status: reported.ok ? "ok" : "erro",
      erro: reported.ok ? null : reported.erro?.trim() || null,
    };
  });

  const okCount = itens.filter((item) => item.status === "ok").length;
  const erroGeral = params.erroGeral?.trim();

  let envioStatus: ArcoEnvioStatus;
  if (erroGeral) {
    envioStatus = "falhou";
  } else if (okCount === itens.length && itens.length > 0) {
    envioStatus = "concluido";
  } else if (okCount > 0) {
    envioStatus = "concluido_com_erros";
  } else {
    envioStatus = "falhou";
  }

  return { envioStatus, itens };
}

export async function applyResultado(
  envioId: number,
  input: { itens: ResultadoItemInput[]; erroGeral?: string },
): Promise<{ status: ArcoEnvioStatus } | null> {
  return db.transaction(async (tx) => {
    const [envio] = await tx.select().from(arcoEnviosTable).where(eq(arcoEnviosTable.id, envioId)).limit(1);
    if (!envio || (envio.status !== "em_andamento" && envio.status !== "interrompido")) {
      return null;
    }

    const existingItens = await tx
      .select({ codigo: arcoEnvioItensTable.codigo })
      .from(arcoEnvioItensTable)
      .where(eq(arcoEnvioItensTable.envioId, envioId));

    const { envioStatus, itens } = computeEnvioResultado({
      codigosEsperados: existingItens.map((i) => i.codigo),
      itensReportados: input.itens,
      erroGeral: input.erroGeral,
    });

    // Índice único (envioId, codigo) garante que cada update abaixo afeta
    // no máximo 1 linha.
    for (const item of itens) {
      await tx
        .update(arcoEnvioItensTable)
        .set({ status: item.status, erro: item.erro })
        .where(and(eq(arcoEnvioItensTable.envioId, envioId), eq(arcoEnvioItensTable.codigo, item.codigo)));
    }

    await tx
      .update(arcoEnviosTable)
      .set({
        status: envioStatus,
        erroGeral: input.erroGeral?.trim() || null,
        finalizadoEm: new Date(),
      })
      .where(eq(arcoEnviosTable.id, envioId));

    return { status: envioStatus };
  });
}
