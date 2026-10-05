// @workspace/db lança na importação se DATABASE_URL não estiver setado (ver
// lib/db/src/index.ts). Testes puros (ex.: resultado.test.ts) importam
// módulos que dependem de @workspace/db mas nunca chegam a abrir conexão —
// então um valor qualquer, só sintaticamente válido, é suficiente quando
// nenhum DATABASE_URL real já foi passado pelo ambiente (ex.: pela suíte de
// integração do claim atômico, que aponta pra um Postgres descartável).
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/arco_test_placeholder";
