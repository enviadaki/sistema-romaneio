import { db, motoristasTable, conferentesTable, cityContactsTable, routesTable, citiesTable, routeCitiesTable } from "@workspace/db";
import { count } from "drizzle-orm";
import { logger } from "./logger";

const MOTORISTAS = [
  { nome: "ANDERSON QUEIROZ", contato: "77998169274" },
  { nome: "LIANDRO OLIVEIRA", contato: "77991146528" },
  { nome: "RAIMUNDO HONÓRIO", contato: "77988453424" },
  { nome: "VICTOR RIBEIRO", contato: "77988679898" },
  { nome: "LUCAS HENRIQUE", contato: "77988738669" },
  { nome: "JULIANO", contato: "77999384411" },
  { nome: "UELLIGTON", contato: "77981428315" },
  { nome: "WAGNER", contato: "77998705657" },
  { nome: "EDVALDO", contato: "77998010225" },
  { nome: "TALLIS GEAN", contato: "77981318486" },
  { nome: "VANDO", contato: "77981132082" },
  { nome: "TIAGO ASIS", contato: "77981582856" },
  { nome: "JOEL DE ANDRADE", contato: "77999888079" },
  { nome: "ADSON SAMPAIO", contato: "75982021426" },
  { nome: "CLAUDIO", contato: "77999494277" },
  { nome: "UESLEI MISSIAS", contato: "77974004511" },
  { nome: "PEDRO", contato: "" },
  { nome: "MICAEL", contato: "77988043695" },
  { nome: "HELIO", contato: "" },
  { nome: "MARCOS DOURADO", contato: "7799596421" },
  { nome: "ARTHUR FREIRE", contato: "" },
];

const CONFERENTES = [
  "ALEXANDRE", "ALEX SOUZA", "RHEUBER", "RAFAEL", "JULIANA",
  "ABRAÃO LOPES", "SERGIO", "LUCAS LIMA", "ADRIANA", "NAIARA",
];

const CIDADES = [
  { city: "ABAIRA", responsavel: "VITOR OLIVEIRA DE AZEVEDO SILVA", contato: "77981419111", operacao: "SHOPEE" },
  { city: "ANAGÉ", responsavel: "MACILENE AMARAL CORDEIRO", contato: "77998482159", operacao: "LOGGI" },
  { city: "ARACATU", responsavel: "SIDNEY JOSE", contato: "77981111927", operacao: "AMAZON" },
  { city: "BARRA DA ESTIVA", responsavel: "LEANDRO ROCHA", contato: "7781002250", operacao: "IMILE" },
  { city: "BARRA DO CHOÇA", responsavel: "MARCOS NASCIMENTO DOS SANTOS", contato: "77999452177", operacao: "" },
  { city: "BELO CAMPO", responsavel: "JOSÉ CARLOS", contato: "77998002269", operacao: "" },
  { city: "BOA NOVA", responsavel: "RENITHON MOREIRA", contato: "77999932298", operacao: "" },
  { city: "BOM JESUS DA SERRA", responsavel: "RENITHON MOREIRA", contato: "77981354705", operacao: "" },
  { city: "BRUMADO", responsavel: "EDIMAR SILVA SANTOS", contato: "77998706700", operacao: "" },
  { city: "BRUMADO AMAZON", responsavel: "PAULINO", contato: "", operacao: "" },
  { city: "CACULÉ", responsavel: "IRIS DARLAN RAMIRO DE SOUZA", contato: "77981519100", operacao: "" },
  { city: "CAETANOS", responsavel: "HELIO FERREIRA", contato: "77988386285", operacao: "" },
  { city: "CAETITÉ", responsavel: "ROBISON DA SILVA BRITO", contato: "77999934688", operacao: "" },
  { city: "CANDIBA", responsavel: "ELSON ADÃO", contato: "77998184567", operacao: "" },
  { city: "CÂNDIDO SALES", responsavel: "TIAGO DA SILVA ASSIS", contato: "77991582856", operacao: "" },
  { city: "CARAÍBAS", responsavel: "VANDERLI TEIXEIRA DA ROCHA", contato: "77981132082", operacao: "" },
  { city: "CARINHANHA", responsavel: "ELSON ADÃO", contato: "77998184567", operacao: "" },
  { city: "CONDEÚBA", responsavel: "MATEUS DE BRITO VERDELHO", contato: "77991868086", operacao: "" },
  { city: "CONTENDAS DO SINCORÁ", responsavel: "LEANDRO ROCHA", contato: "7781002250", operacao: "" },
  { city: "CORDEIROS", responsavel: "MARCOS SANTOS MOREIRA", contato: "77988643480", operacao: "" },
  { city: "DOM BASÍLIO", responsavel: "JEFTE FERREIRA", contato: "77991521276", operacao: "" },
  { city: "ÉRICO CARDOSO", responsavel: "JOAQUIM COTINGUIBA", contato: "77999906558", operacao: "" },
  { city: "GUAJERU", responsavel: "DOGLAS DIAS CANGUSSU", contato: "77988341913", operacao: "" },
  { city: "GUANAMBI", responsavel: "ELSON ADÃO", contato: "77998184567", operacao: "" },
  { city: "IBIASSUCÊ", responsavel: "MAYCON VINICIUS BRITO BALEEIRO", contato: "77991868571", operacao: "" },
  { city: "IBICOARA", responsavel: "LEANDRO ROCHA", contato: "7781002250", operacao: "" },
  { city: "IBICUÍ", responsavel: "JOÃO CAMAMU", contato: "73981091087", operacao: "" },
  { city: "IBITIRA", responsavel: "LUCILEIA SANTOS DA SILVA", contato: "77981449006", operacao: "" },
  { city: "IGUAÍ", responsavel: "HENRIQUE", contato: "77982201641", operacao: "" },
  { city: "ITAETE", responsavel: "LEANDRO ROCHA", contato: "7781002250", operacao: "" },
  { city: "ITAMBÉ", responsavel: "HEVERTON MICHAEL SANTOS SANTANA", contato: "77999115047", operacao: "" },
  { city: "ITAPETINGA", responsavel: "YCARO DA SILVA FRANÇA DE SOUZA", contato: "77991350687", operacao: "" },
  { city: "ITAPETINGA 1", responsavel: "YCARO DA SILVA FRANÇA DE SOUZA", contato: "77991350687", operacao: "" },
  { city: "ITAPETINGA 2", responsavel: "MARLON FEITOSA DA SILVA", contato: "77991025025", operacao: "" },
  { city: "ITAPETINGA 3", responsavel: "MAICON DE SOUZA SILVA", contato: "77991119123", operacao: "" },
  { city: "ITAPETINGA 4", responsavel: "MATEUS ALMEIDA OLIVEIRA", contato: "77991350687", operacao: "" },
  { city: "ITAPETINGA 5", responsavel: "VANESSA DE SOUSA SILVA", contato: "77988763557", operacao: "" },
  { city: "ITAPETINGA 6", responsavel: "MATEUS ALMEIDA OLIVEIRA", contato: "77991350687", operacao: "" },
  { city: "ITAPETINGA 7", responsavel: "MATEUS ALMEIDA OLIVEIRA", contato: "77991350687", operacao: "" },
  { city: "ITAPETINGA 8", responsavel: "MAICON DE SOUZA SILVA", contato: "77991119123", operacao: "" },
  { city: "ITARANTIM", responsavel: "PATRICIA SANTOS DE JESUS", contato: "73981086029", operacao: "" },
  { city: "ITORORÓ", responsavel: "CARLOS DIEGO", contato: "73999353657", operacao: "" },
  { city: "ITUAÇU", responsavel: "LEANDRO ROCHA", contato: "7781002250", operacao: "" },
  { city: "IUIÚ", responsavel: "ELSON ADÃO", contato: "77998184567", operacao: "" },
  { city: "JACARACI", responsavel: "ELSON ADÃO", contato: "77998184567", operacao: "" },
  { city: "JUSSIAPE", responsavel: "VITOR OLIVEIRA DE AZEVEDO SILVA", contato: "77981419111", operacao: "" },
  { city: "LAGOA REAL", responsavel: "MARIA ROSA MARTINS DOS SANTOS", contato: "77988222073", operacao: "" },
  { city: "LICÍNIO DE ALMEIDA", responsavel: "ELSON ADÃO", contato: "77998184567", operacao: "" },
  { city: "LIVRAMENTO DE NOSSA SENHORA", responsavel: "SAMUEL OLIVEIRA DOS SANTOS", contato: "77981146237", operacao: "" },
  { city: "MACARANI", responsavel: "GILSON LIMA PEREIRA", contato: "77988059096", operacao: "" },
  { city: "MAETINGA", responsavel: "VANDERLI TEIXEIRA DA ROCHA", contato: "77981132082", operacao: "" },
  { city: "MAIQUINIQUE", responsavel: "AURELIO DAS VIRGENS MEIRA JUNIOR", contato: "77991130813", operacao: "" },
  { city: "MALHADA", responsavel: "ELSON ADÃO", contato: "77998184567", operacao: "" },
  { city: "MALHADA DE PEDRAS", responsavel: "TIAGO CANGUSSU FILHO", contato: "77988749749", operacao: "" },
  { city: "MATINA", responsavel: "ELSON ADÃO", contato: "77998184567", operacao: "" },
  { city: "MIRANTE", responsavel: "RENITHON MOREIRA", contato: "77988735307", operacao: "" },
  { city: "MORTUGABA", responsavel: "ELSON ADÃO", contato: "77998184567", operacao: "" },
  { city: "NOVA CANAÃ", responsavel: "VANCLEI NOVAES DOS SANTOS", contato: "73988548634", operacao: "" },
  { city: "PALMAS DE MONTE ALTO", responsavel: "ELSON ADÃO", contato: "77998184567", operacao: "" },
  { city: "PARAMIRIM", responsavel: "ISNAR BONFIM", contato: "77999906558", operacao: "" },
  { city: "PIATÃ", responsavel: "GABRIEL NOVAES", contato: "77992096788", operacao: "" },
  { city: "PINDAÍ", responsavel: "ELSON ADÃO", contato: "77998184567", operacao: "" },
  { city: "PIRIPÁ", responsavel: "IURY BARBOSA RIBEIRO MAIA", contato: "77981608953", operacao: "" },
  { city: "PLANALTO", responsavel: "RENITHON MOREIRA", contato: "77999671178", operacao: "" },
  { city: "POÇÕES", responsavel: "RENITHON MOREIRA", contato: "77981355753", operacao: "" },
  { city: "POTIRAGUÁ", responsavel: "ISAEL SILVA TIGRE", contato: "77982094292", operacao: "" },
  { city: "PRESIDENTE JÂNIO QUADROS", responsavel: "VANDERLI TEIXEIRA DA ROCHA", contato: "77981132082", operacao: "" },
  { city: "RIBEIRÃO DO LARGO", responsavel: "IRIS LIMA", contato: "77988655231", operacao: "" },
  { city: "RIO DE CONTAS", responsavel: "VITOR OLIVEIRA DE AZEVEDO SILVA", contato: "77981419111", operacao: "" },
  { city: "RIO DO ANTÔNIO", responsavel: "LUCILEIA SANTOS DA SILVA", contato: "77981449006", operacao: "" },
  { city: "SEBASTIÃO LARANJEIRAS", responsavel: "ELSON ADÃO", contato: "77998184567", operacao: "" },
  { city: "TANHAÇU", responsavel: "LEANDRO ROCHA", contato: "7781002250", operacao: "" },
  { city: "TREMEDAL", responsavel: "JANAINA DOS SANTOS VIEIRA", contato: "77998555879", operacao: "" },
  { city: "URANDI", responsavel: "ELSON ADÃO", contato: "77998184567", operacao: "" },
];

// 58 sub-routes (each identifies a specific delivery area)
const ROUTES_WITH_CITIES: { name: string; cities: string[] }[] = [
  { name: "ABAIRA - ROTA 03.4",              cities: ["ABAÍRA", "CATÓLES"] },
  { name: "ANAGE - RETIRA 05",               cities: ["ANAGÉ"] },
  { name: "ARACATU - ROTA 05",               cities: ["ARACATU"] },
  { name: "BARRA DO CHOÇA - RETIRA 06",      cities: ["BARRA DO CHOÇA"] },
  { name: "BELO CAMPO - RETIRA 03",          cities: ["BELO CAMPO"] },
  { name: "BOA NOVA - ROTA 01",              cities: ["BOA NOVA"] },
  { name: "BOM JESUS DA SERRA - ROTA 01",    cities: ["BOM JESUS DA SERRA"] },
  { name: "BRUMADO - ROTA 05.1",             cities: ["BRUMADO", "UBIRACABA"] },
  { name: "CACULE - ROTA 05.2",              cities: ["CACULÉ"] },
  { name: "CAETANOS - RETIRA 01",            cities: ["CAETANOS"] },
  { name: "CAETITE - ROTA 05.3",             cities: ["CAETITÉ"] },
  { name: "CANDIBA - ROTA 05.4",             cities: ["CANDIBA"] },
  { name: "CANDIDO SALES - RETIRA 02",       cities: ["CÂNDIDO SALES", "LAGOA GRANDE", "QUARAÇU"] },
  { name: "CARAIBAS - RETIRA 05",            cities: ["CARAÍBAS", "PRESIDENTE JÂNIO QUADROS"] },
  { name: "CARIRANHA - ROTA 05.4",           cities: ["CARINHANHA"] },
  { name: "CONDEUBA - RETIRA 03",            cities: ["CONDEÚBA"] },
  { name: "CORDEIROS - RETIRA 03",           cities: ["CORDEIROS"] },
  { name: "DOM BASILIO - ROTA 03.3",         cities: ["DOM BASÍLIO"] },
  { name: "ERICO CARDOSO - ROTA 03.2",       cities: ["ÉRICO CARDOSO"] },
  { name: "GUAJERU - ROTA 05.2",             cities: ["GUAJERU"] },
  { name: "GUANAMBI - ROTA 05.5",            cities: ["GUANAMBI", "MORRINHOS", "MUTAS", "TANQUE NOVO"] },
  { name: "IBICUI - ROTA 01",                cities: ["IBICUÍ"] },
  { name: "IBISSUCE - ROTA 05.2",            cities: ["IBIASSUCÊ"] },
  { name: "IGUAI - ROTA 02",                 cities: ["IGUAÍ", "IGUAIBI"] },
  { name: "ITAMBÉ - ROTA 04",               cities: ["ITAMBÉ"] },
  { name: "ITAPETINGA - ROTA 04",            cities: ["ITAPETINGA", "ITAPITANGA"] },
  { name: "ITARANTIM - ROTA 04",             cities: ["ITARANTIM"] },
  { name: "ITORORO - ROTA 04",               cities: ["ITORORÓ", "RIO DO MEIO"] },
  { name: "ITUAÇU - ROTA 03",               cities: ["BARRA DA ESTIVA", "CONTENDAS DO SINCORÁ", "IBICOARA", "ITAETÉ", "ITUAÇU", "TANHAÇU", "TRIUNFO DO SINCORÁ"] },
  { name: "IUIU - ROTA 05.4",               cities: ["IUIÚ"] },
  { name: "JACARACI - ROTA 05.4",            cities: ["IRUNDIARA", "JACARACI"] },
  { name: "JUSSIAPE - ROTA 03.4",            cities: ["CARAGUATAÍ", "JUSSIAPE"] },
  { name: "LAGOA REAL - ROTA 05.2",          cities: ["LAGOA REAL"] },
  { name: "LICINIO DE ALMEIDA - ROTA 05.4",  cities: ["LICÍNIO DE ALMEIDA"] },
  { name: "LIVRAMENTO - ROTA 03.3",          cities: ["LIVRAMENTO DE NOSSA SENHORA", "ITANAGÉ"] },
  { name: "MACARANI - ROTA 04",              cities: ["MACARANI"] },
  { name: "MAETINGA - RETIRA 05",            cities: ["MAETINGA"] },
  { name: "MAIQUENIQUE - ROTA 04",           cities: ["MAIQUINIQUE"] },
  { name: "MALHADA DE PEDRAS - ROTA 05.2",   cities: ["MALHADA DE PEDRAS"] },
  { name: "MALHADA - ROTA 05.4",             cities: ["MALHADA"] },
  { name: "MATINA - ROTA 05.4",              cities: ["MATINA"] },
  { name: "MIRANTE - ROTA 01",               cities: ["MIRANTE"] },
  { name: "MORTUGABA - ROTA 05.4",           cities: ["MORTUGABA"] },
  { name: "NOVA CANAÃ - ROTA 02",            cities: ["NOVA CANAÃ"] },
  { name: "PALMAS DE MONTE ALTO - ROTA 05.4",cities: ["PALMAS DE MONTE ALTO"] },
  { name: "PARAMIRIM - ROTA 03.2",           cities: ["PARAMIRIM"] },
  { name: "PIATÃ - ROTA 03.5",              cities: ["CABRÁLIA", "PIATÃ"] },
  { name: "PINDAI - ROTA 05.4",              cities: ["PINDAÍ"] },
  { name: "PIRIPA - RETIRA 03",              cities: ["PIRIPÁ"] },
  { name: "PLANALTO - ROTA 01",              cities: ["PLANALTO"] },
  { name: "POÇÕES - ROTA 01",               cities: ["POÇÕES"] },
  { name: "POTIRAGUA - ROTA 04",             cities: ["POTIRAGUÁ"] },
  { name: "RIO DE CONTAS - ROTA 03.3",       cities: ["ARAPIRANGA", "MARCOLINO MOURA", "RIO DE CONTAS"] },
  { name: "RIO DO ANTONIO - ROTA 05.2",      cities: ["IBITIRA", "RIO DO ANTÔNIO"] },
  { name: "SEBASTIÃO LARANJEIRAS - ROTA 05.4", cities: ["BOQUIRA", "SEBASTIÃO LARANJEIRAS"] },
  { name: "TREMENDAL - RETIRA 03",           cities: ["TREMEDAL"] },
  { name: "URANDI - ROTA 05.4",              cities: ["URANDI"] },
  { name: "VCA",                             cities: ["VITÓRIA DA CONQUISTA"] },
];

// Canonical city names referenced by routes (+ extras not in city_contacts)
const EXTRA_ADMIN_CITIES = [
  "ABAÍRA", "ARAPIRANGA", "BOQUIRA", "CABRÁLIA", "CARAGUATAÍ",
  "CATÓLES", "IGUAIBI", "IRUNDIARA", "ITANAGÉ", "ITAPITANGA",
  "ITAETÉ", "LAGOA GRANDE", "MARCOLINO MOURA", "MORRINHOS",
  "MUTAS", "QUARAÇU", "RIO DO MEIO", "TANQUE NOVO",
  "TRIUNFO DO SINCORÁ", "UBIRACABA", "VITÓRIA DA CONQUISTA",
];

export async function seedReferenceData(): Promise<void> {
  try {
    const [
      [{ value: mCount }],
      [{ value: cCount }],
      [{ value: ccCount }],
      [{ value: rCount }],
      [{ value: citCount }],
    ] = await Promise.all([
      db.select({ value: count() }).from(motoristasTable),
      db.select({ value: count() }).from(conferentesTable),
      db.select({ value: count() }).from(cityContactsTable),
      db.select({ value: count() }).from(routesTable),
      db.select({ value: count() }).from(citiesTable),
    ]);

    const tasks: Promise<unknown>[] = [];

    if (mCount === 0) {
      tasks.push(
        db.insert(motoristasTable).values(MOTORISTAS).onConflictDoNothing().then(() => {
          logger.info({ count: MOTORISTAS.length }, "Seed: motoristas inseridos");
        })
      );
    }

    if (cCount === 0) {
      tasks.push(
        db
          .insert(conferentesTable)
          .values(CONFERENTES.map((nome) => ({ nome })))
          .onConflictDoNothing()
          .then(() => {
            logger.info({ count: CONFERENTES.length }, "Seed: conferentes inseridos");
          })
      );
    }

    if (ccCount === 0) {
      tasks.push(
        db
          .insert(cityContactsTable)
          .values(
            CIDADES.map((c) => ({
              city: c.city,
              responsavel: c.responsavel,
              contato: c.contato,
              operacao: c.operacao,
              entregador: "",
              motorista: "",
              contatoMotorista: "",
              conferente: "",
            }))
          )
          .onConflictDoNothing()
          .then(() => {
            logger.info({ count: CIDADES.length }, "Seed: city_contacts inseridas");
          })
      );
    }

    // Seed routes + cities + route_cities together only when routes are empty
    if (rCount === 0) {
      const routeNames = ROUTES_WITH_CITIES.map((r) => ({ name: r.name }));
      const insertedRoutes = await db
        .insert(routesTable)
        .values(routeNames)
        .onConflictDoNothing()
        .returning({ id: routesTable.id, name: routesTable.name });
      logger.info({ count: insertedRoutes.length }, "Seed: rotas inseridas");

      // Build city name set from routes + extras
      const allCityNamesSet = new Set<string>();
      for (const r of ROUTES_WITH_CITIES) {
        for (const c of r.cities) allCityNamesSet.add(c);
      }
      for (const c of EXTRA_ADMIN_CITIES) allCityNamesSet.add(c);

      let insertedCities: { id: number; name: string }[] = [];
      if (citCount === 0) {
        const cityValues = Array.from(allCityNamesSet).map((name) => ({ name }));
        insertedCities = await db
          .insert(citiesTable)
          .values(cityValues)
          .onConflictDoNothing()
          .returning({ id: citiesTable.id, name: citiesTable.name });
        logger.info({ count: insertedCities.length }, "Seed: cidades inseridas");
      } else {
        // Cities already exist — fetch them to build route_cities
        insertedCities = await db
          .select({ id: citiesTable.id, name: citiesTable.name })
          .from(citiesTable);
      }

      // Build lookup maps
      const routeIdByName = new Map(insertedRoutes.map((r) => [r.name, r.id]));
      const cityIdByName = new Map(
        insertedCities.map((c) => [c.name.toLowerCase(), c.id])
      );

      // Build route_cities pairs
      const pairs: { routeId: number; cityId: number }[] = [];
      for (const route of ROUTES_WITH_CITIES) {
        const routeId = routeIdByName.get(route.name);
        if (!routeId) continue;
        for (const cityName of route.cities) {
          const cityId = cityIdByName.get(cityName.toLowerCase());
          if (cityId) pairs.push({ routeId, cityId });
        }
      }

      if (pairs.length > 0) {
        await db
          .insert(routeCitiesTable)
          .values(pairs)
          .onConflictDoNothing();
        logger.info({ count: pairs.length }, "Seed: route_cities inseridas");
      }
    }

    if (tasks.length > 0) await Promise.all(tasks);
  } catch (err) {
    logger.error({ err }, "Seed: erro ao inserir dados de referência");
  }
}
