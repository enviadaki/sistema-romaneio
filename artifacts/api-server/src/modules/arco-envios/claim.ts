import { and, eq, sql } from "drizzle-orm";
import { db, arcoEnviosTable, type ArcoEnvio } from "@workspace/db";

function mapRawEnvioRow(row: Record<string, unknown>): ArcoEnvio {
  return {
    id: row.id as number,
    operation: row.operation as string,
    romaneioData: row.romaneio_data as string,
    romaneioEscopoTipo: row.romaneio_escopo_tipo as string,
    romaneioEscopoValor: row.romaneio_escopo_valor as string,
    romaneioLabel: row.romaneio_label as string,
    status: row.status as string,
    criadoPor: (row.criado_por as string | null) ?? null,
    criadoEm: new Date(row.criado_em as string),
    iniciadoEm: row.iniciado_em ? new Date(row.iniciado_em as string) : null,
    finalizadoEm: row.finalizado_em ? new Date(row.finalizado_em as string) : null,
    ultimoHeartbeat: row.ultimo_heartbeat ? new Date(row.ultimo_heartbeat as string) : null,
    erroGeral: (row.erro_geral as string | null) ?? null,
    envioOrigemId: (row.envio_origem_id as number | null) ?? null,
  };
}

// Claim atômico do envio pendente mais antigo — usa SQL bruto porque o
// query builder do Drizzle não expressa "UPDATE ... WHERE id = (SELECT ...
// FOR UPDATE SKIP LOCKED)". Isso é o que garante que dois agentes (ou dois
// polls concorrentes do mesmo agente) nunca reivindiquem o mesmo envio —
// cada um pula as linhas já travadas pela outra transação em vez de
// esperar por elas. Único lugar do módulo que precisa de SQL bruto; o
// resto usa o query builder normalmente.
export async function claimNextEnvio(): Promise<ArcoEnvio | null> {
  const result = await db.execute(sql`
    UPDATE arco_envios
    SET status = 'em_andamento', iniciado_em = now(), ultimo_heartbeat = now()
    WHERE id = (
      SELECT id FROM arco_envios
      WHERE status = 'pendente'
      ORDER BY criado_em ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `);

  const row = result.rows[0] as Record<string, unknown> | undefined;
  return row ? mapRawEnvioRow(row) : null;
}

export async function markHeartbeat(envioId: number): Promise<boolean> {
  const rows = await db
    .update(arcoEnviosTable)
    .set({ ultimoHeartbeat: new Date() })
    .where(and(eq(arcoEnviosTable.id, envioId), eq(arcoEnviosTable.status, "em_andamento")))
    .returning({ id: arcoEnviosTable.id });
  return rows.length > 0;
}

const HEARTBEAT_TIMEOUT_SQL = sql`now() - interval '10 minutes'`;

// Varredura periódica (ver index.ts): envio em_andamento sem heartbeat há
// mais de 10 minutos vira "interrompido". NUNCA volta pra pendente sozinho
// — evita bipagem duplicada no ARCO se o agente ainda estiver, de fato,
// processando (ex.: rede lenta) e reaparecer depois.
export async function sweepStaleEnvios(): Promise<number> {
  const rows = await db
    .update(arcoEnviosTable)
    .set({ status: "interrompido" })
    .where(
      and(
        eq(arcoEnviosTable.status, "em_andamento"),
        sql`${arcoEnviosTable.ultimoHeartbeat} < ${HEARTBEAT_TIMEOUT_SQL}`,
      ),
    )
    .returning({ id: arcoEnviosTable.id });
  return rows.length;
}
