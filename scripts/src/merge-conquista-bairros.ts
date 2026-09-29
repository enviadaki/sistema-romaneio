// Script de uso único: reduz o número de sub-rotas de Vitória da Conquista
// juntando alguns bairros vizinhos numa rota só (a pedido do usuário, depois
// de rodar em produção com as 26 rotas separadas — ver
// seed-conquista-bairros.ts e plano "rotas-bairro-conquista-loggi").
//
// Pra cada par, os CEPs do bairro "absorvido" são movidos pra rota do
// bairro "sobrevivente" (o de número mais baixo) e a rota do bairro
// absorvido é apagada (não há mais nenhum CEP apontando pra ela, então não
// aparece mais em nenhum seletor). A rota sobrevivente é renomeada pra
// deixar claro que agora cobre os dois bairros.
//
// Pacotes/romaneios JÁ bipados antes dessa junção mantêm o nome antigo da
// rota que tinham na hora — isso é só um registro histórico em texto, não
// uma referência viva, então não precisa (nem deveria) ser alterado.
//
// Idempotente — pode rodar mais de uma vez sem erro: um par já mesclado
// (rota absorvida já não existe mais) é simplesmente pulado.
//
// Rodar UMA VEZ em produção, depois de aplicar o patch:
//   pnpm --filter scripts merge-conquista-bairros
import { db, routesTable, loggiRouteCepsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

interface MergePair {
  survivorName: string; // nome atual exato da rota que fica
  absorbedName: string; // nome atual exato da rota que é apagada
  newName: string; // novo nome da rota sobrevivente, cobrindo os dois bairros
}

const MERGES: MergePair[] = [
  {
    survivorName: "CONQUISTA - ROTA 7.1 (CENTRO)",
    absorbedName: "CONQUISTA - ROTA 7.9 (RECREIO)",
    newName: "CONQUISTA - ROTA 7.1 (CENTRO / RECREIO)",
  },
  {
    survivorName: "CONQUISTA - ROTA 7.3 (CRUZEIRO)",
    absorbedName: "CONQUISTA - ROTA 7.5 (ALTO MARON)",
    newName: "CONQUISTA - ROTA 7.3 (CRUZEIRO / ALTO MARON)",
  },
  {
    survivorName: "CONQUISTA - ROTA 7.16 (BRASIL)",
    absorbedName: "CONQUISTA - ROTA 7.21 (PATAGÔNIA)",
    newName: "CONQUISTA - ROTA 7.16 (BRASIL / PATAGÔNIA)",
  },
];

async function main() {
  for (const merge of MERGES) {
    const [survivor] = await db.select().from(routesTable).where(eq(routesTable.name, merge.survivorName));
    const [absorbed] = await db.select().from(routesTable).where(eq(routesTable.name, merge.absorbedName));

    if (!survivor) {
      console.log(`PULADO: rota sobrevivente "${merge.survivorName}" não encontrada — confira o nome exato.`);
      continue;
    }

    if (!absorbed) {
      console.log(`OK (já mesclado antes): "${merge.absorbedName}" não existe mais.`);
      continue;
    }

    const moved = await db
      .update(loggiRouteCepsTable)
      .set({ routeId: survivor.id })
      .where(eq(loggiRouteCepsTable.routeId, absorbed.id))
      .returning({ id: loggiRouteCepsTable.id });

    await db.delete(routesTable).where(eq(routesTable.id, absorbed.id));

    if (survivor.name !== merge.newName) {
      await db.update(routesTable).set({ name: merge.newName }).where(eq(routesTable.id, survivor.id));
    }

    console.log(
      `Mesclado: "${merge.absorbedName}" -> "${merge.newName}" (${moved.length} CEP(s) movidos, rota antiga apagada)`,
    );
  }

  console.log("");
  console.log("Pronto.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
