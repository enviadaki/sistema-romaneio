// Script de uso único: cria as 26 sub-rotas de Vitória da Conquista (uma por
// bairro, "CONQUISTA - ROTA 7.1 (CENTRO)" até "CONQUISTA - ROTA 7.26 (NOSSA
// SENHORA APARECIDA)") e cadastra os CEPs de cada bairro na tabela nova
// loggi_route_ceps (ver plano "rotas-bairro-conquista-loggi" e
// modules/loggi/rota.ts: resolveLoggiRotaForCep).
//
// Idempotente — pode rodar mais de uma vez sem duplicar nada: rota já
// existente (mesmo nome) é reaproveitada, e CEP já cadastrado é ignorado
// (onConflictDoNothing, cep é unique).
//
// Rodar UMA VEZ em produção, depois de aplicar o patch e rodar
// `pnpm --filter db push` (a tabela loggi_route_ceps precisa existir antes):
//   pnpm --filter scripts seed-conquista-bairros
import { db, routesTable, loggiRouteCepsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CONQUISTA_SUB_ROUTES } from "./conquista-sub-routes-data";

async function main() {
  let routesCreated = 0;
  let routesReused = 0;
  let cepsInserted = 0;
  let cepsSkipped = 0;

  for (const sub of CONQUISTA_SUB_ROUTES) {
    const name = `CONQUISTA - ROTA ${sub.numero} (${sub.bairro.toUpperCase()})`;

    let [route] = await db.select().from(routesTable).where(eq(routesTable.name, name));
    if (!route) {
      [route] = await db.insert(routesTable).values({ name }).returning();
      routesCreated++;
    } else {
      routesReused++;
    }

    const values = sub.ceps.map((cep) => ({ cep, bairro: sub.bairro, routeId: route.id }));
    const inserted = await db
      .insert(loggiRouteCepsTable)
      .values(values)
      .onConflictDoNothing()
      .returning({ id: loggiRouteCepsTable.id });

    cepsInserted += inserted.length;
    cepsSkipped += values.length - inserted.length;

    console.log(
      `${sub.numero} ${sub.bairro}: rota "${name}" (${route.id}) — ${inserted.length}/${values.length} CEPs novos` +
        (values.length - inserted.length > 0 ? ` (${values.length - inserted.length} já existiam)` : ""),
    );
  }

  console.log("");
  console.log(
    `Pronto: ${routesCreated} rota(s) criada(s), ${routesReused} já existiam, ` +
      `${cepsInserted} CEP(s) novo(s) inserido(s), ${cepsSkipped} já estavam cadastrados.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
