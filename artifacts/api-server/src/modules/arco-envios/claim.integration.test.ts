import { afterAll, beforeEach, describe, expect, it } from "vitest";

// Teste de integração de verdade — precisa de um Postgres alcançável, com o
// schema já aplicado (drizzle push). Roda só quando DATABASE_URL aponta pra
// um banco real (não o placeholder de src/test/setup.ts); nos outros casos
// (typecheck normal, CI sem Postgres) é pulado em vez de falhar.
//
// Como rodar (contra um Postgres descartável, nunca o de produção):
//   docker network create arco-test-net
//   docker run -d --rm --name arco-test-pg --network arco-test-net \
//     -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=test postgres:16-alpine
//   docker run --rm --network arco-test-net -v "$PWD":/app -w /app \
//     -e DATABASE_URL=postgresql://test:test@arco-test-pg:5432/test \
//     node:22-bookworm-slim bash -c "corepack enable && pnpm --filter @workspace/db run push-force && pnpm --filter @workspace/api-server test"
const isRealDb = !process.env.DATABASE_URL?.includes("arco_test_placeholder");

describe.skipIf(!isRealDb)("claimNextEnvio (integração, concorrência real)", () => {
  // Imports dinâmicos — só tentam abrir conexão se este describe realmente
  // rodar (isRealDb), depois que setup.ts já definiu DATABASE_URL.
  let db: typeof import("@workspace/db").db;
  let arcoEnviosTable: typeof import("@workspace/db").arcoEnviosTable;
  let arcoEnvioItensTable: typeof import("@workspace/db").arcoEnvioItensTable;
  let claimNextEnvio: typeof import("./claim").claimNextEnvio;
  let markHeartbeat: typeof import("./claim").markHeartbeat;
  let sweepStaleEnvios: typeof import("./claim").sweepStaleEnvios;

  beforeEach(async () => {
    ({ db, arcoEnviosTable, arcoEnvioItensTable } = await import("@workspace/db"));
    ({ claimNextEnvio, markHeartbeat, sweepStaleEnvios } = await import("./claim"));
    await db.delete(arcoEnvioItensTable);
    await db.delete(arcoEnviosTable);
  });

  afterAll(async () => {
    if (!isRealDb) return;
    const { pool } = await import("@workspace/db");
    await pool.end();
  });

  it("nunca reivindica o mesmo envio duas vezes sob concorrência", async () => {
    const TOTAL_ENVIOS = 20;
    await db.insert(arcoEnviosTable).values(
      Array.from({ length: TOTAL_ENVIOS }, (_, i) => ({
        operation: "LOGGI",
        romaneioData: "2026-01-01",
        romaneioEscopoTipo: "cidade",
        romaneioEscopoValor: `cidade-${i}`,
        romaneioLabel: `Cidade ${i}`,
        status: "pendente" as const,
      })),
    );

    // Mais "agentes" concorrentes do que envios pendentes, pra garantir que
    // sobra gente competindo por nada (deve receber null, não um duplicado).
    const CONCURRENT_CLAIMERS = TOTAL_ENVIOS + 10;
    const results = await Promise.all(
      Array.from({ length: CONCURRENT_CLAIMERS }, () => claimNextEnvio()),
    );

    const claimedIds = results.filter((r) => r !== null).map((r) => r!.id);
    expect(claimedIds).toHaveLength(TOTAL_ENVIOS);
    expect(new Set(claimedIds).size).toBe(TOTAL_ENVIOS);

    const nullCount = results.filter((r) => r === null).length;
    expect(nullCount).toBe(CONCURRENT_CLAIMERS - TOTAL_ENVIOS);

    const stillPendente = await db
      .select()
      .from(arcoEnviosTable)
      .where((await import("drizzle-orm")).eq(arcoEnviosTable.status, "pendente"));
    expect(stillPendente).toHaveLength(0);
  });

  it("retorna null quando não há envio pendente", async () => {
    const result = await claimNextEnvio();
    expect(result).toBeNull();
  });

  it("markHeartbeat só atualiza envio em_andamento", async () => {
    const { eq } = await import("drizzle-orm");
    const [pendente] = await db
      .insert(arcoEnviosTable)
      .values({
        operation: "LOGGI",
        romaneioData: "2026-01-01",
        romaneioEscopoTipo: "cidade",
        romaneioEscopoValor: "x",
        romaneioLabel: "X",
        status: "pendente",
      })
      .returning();

    expect(await markHeartbeat(pendente.id)).toBe(false);

    const claimed = await claimNextEnvio();
    expect(claimed!.id).toBe(pendente.id);
    expect(await markHeartbeat(claimed!.id)).toBe(true);

    const [row] = await db.select().from(arcoEnviosTable).where(eq(arcoEnviosTable.id, pendente.id));
    expect(row.ultimoHeartbeat).not.toBeNull();
  });

  it("sweepStaleEnvios marca como interrompido só quem está em_andamento há mais de 10min sem heartbeat, e nunca volta pra pendente", async () => {
    const { eq, sql } = await import("drizzle-orm");

    const [stale] = await db
      .insert(arcoEnviosTable)
      .values({
        operation: "LOGGI",
        romaneioData: "2026-01-01",
        romaneioEscopoTipo: "cidade",
        romaneioEscopoValor: "stale",
        romaneioLabel: "Stale",
        status: "em_andamento",
      })
      .returning();
    await db
      .update(arcoEnviosTable)
      .set({ ultimoHeartbeat: sql`now() - interval '11 minutes'` })
      .where(eq(arcoEnviosTable.id, stale.id));

    const [fresh] = await db
      .insert(arcoEnviosTable)
      .values({
        operation: "LOGGI",
        romaneioData: "2026-01-01",
        romaneioEscopoTipo: "cidade",
        romaneioEscopoValor: "fresh",
        romaneioLabel: "Fresh",
        status: "em_andamento",
      })
      .returning();
    await db
      .update(arcoEnviosTable)
      .set({ ultimoHeartbeat: sql`now() - interval '1 minute'` })
      .where(eq(arcoEnviosTable.id, fresh.id));

    const swept = await sweepStaleEnvios();
    expect(swept).toBe(1);

    const [staleAfter] = await db.select().from(arcoEnviosTable).where(eq(arcoEnviosTable.id, stale.id));
    expect(staleAfter.status).toBe("interrompido");

    const [freshAfter] = await db.select().from(arcoEnviosTable).where(eq(arcoEnviosTable.id, fresh.id));
    expect(freshAfter.status).toBe("em_andamento");
  });
});
