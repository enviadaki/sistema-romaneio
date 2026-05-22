import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não definido");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

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
  { city: "IBICUI", responsavel: "JOÃO CAMAMU", contato: "73981091087", operacao: "" },
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

async function main() {
  const client = await pool.connect();
  try {
    console.log("Inserindo cidades...");
    for (const c of CIDADES) {
      await client.query(
        `INSERT INTO city_contacts (city, responsavel, contato, operacao, entregador, motorista, contato_motorista, conferente)
         VALUES ($1, $2, $3, $4, '', '', '', '')
         ON CONFLICT (city) DO UPDATE SET responsavel = $2, contato = $3, operacao = $4`,
        [c.city, c.responsavel, c.contato, c.operacao]
      );
    }
    console.log(`✓ ${CIDADES.length} cidades`);

    console.log("Inserindo motoristas...");
    for (const m of MOTORISTAS) {
      await client.query(
        `INSERT INTO motoristas (nome, contato) VALUES ($1, $2)
         ON CONFLICT (nome) DO UPDATE SET contato = $2`,
        [m.nome, m.contato]
      );
    }
    console.log(`✓ ${MOTORISTAS.length} motoristas`);

    console.log("Inserindo conferentes...");
    for (const nome of CONFERENTES) {
      await client.query(
        `INSERT INTO conferentes (nome) VALUES ($1) ON CONFLICT (nome) DO NOTHING`,
        [nome]
      );
    }
    console.log(`✓ ${CONFERENTES.length} conferentes`);

    console.log("\n✅ Seed concluído!");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
