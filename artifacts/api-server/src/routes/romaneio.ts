import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOperationAccess } from "../middlewares/requireOperationAccess";
import { resolveRomaneioItems } from "../modules/romaneio/resolve";

const router: IRouter = Router();

router.get("/romaneio", requireAuth, requireOperationAccess, async (req, res): Promise<void> => {
  const date = (req.query.date as string | undefined)?.trim();
  if (!date) {
    res.status(400).json({ error: "date is required" });
    return;
  }

  const city = (req.query.city as string | undefined)?.trim();
  const citiesParam = (req.query.cities as string | undefined)?.trim();
  const rota = (req.query.rota as string | undefined)?.trim();
  const label = (req.query.label as string | undefined)?.trim();
  const operation = (req.query.operation as string | undefined)?.trim() ?? "LOGGI";

  // Modo "rota exata" — usado pelas sub-rotas por bairro (ex.: Vitória da
  // Conquista, "CONQUISTA - ROTA 7.X"), onde várias rotas dividem a MESMA
  // cidade e por isso o filtro por cidade (abaixo) não dá pra separar uma
  // da outra — precisa casar com o campo `rota` gravado no pacote/scan
  // (resolvido por CEP no cadastro), não com a cidade. Continua servindo
  // qualquer rota, não só as de Conquista, mas hoje só elas usam esse modo
  // (routes-data.ts, no frontend, continua sendo o modo "cidade" pra tudo
  // mais). Checado ANTES do modo cidade — se `rota` veio, ignora city/cities.
  if (rota) {
    const romaneioItems = await resolveRomaneioItems({ date, operation, rota });

    res.json({
      city: label ?? rota,
      date,
      totalCount: romaneioItems.length,
      packages: romaneioItems,
    });
    return;
  }

  // Route mode: cities comma-separated
  const cityList = citiesParam
    ? citiesParam.split(",").map((c) => c.trim()).filter(Boolean)
    : city
    ? [city]
    : [];

  if (cityList.length === 0) {
    res.status(400).json({ error: "city or cities is required" });
    return;
  }

  const romaneioItems = await resolveRomaneioItems({ date, operation, cities: cityList });

  const displayLabel = label ?? city ?? cityList[0] ?? "";

  res.json({
    city: displayLabel,
    date,
    totalCount: romaneioItems.length,
    packages: romaneioItems,
  });
});

export default router;
