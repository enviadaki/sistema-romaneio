import type { ArcoEnvio, ArcoEnvioItem } from "@workspace/db";

export function mapEnvio(envio: ArcoEnvio) {
  return {
    id: envio.id,
    operation: envio.operation,
    romaneioData: envio.romaneioData,
    romaneioEscopoTipo: envio.romaneioEscopoTipo,
    romaneioEscopoValor: envio.romaneioEscopoValor,
    romaneioLabel: envio.romaneioLabel,
    status: envio.status,
    criadoPor: envio.criadoPor ?? null,
    criadoEm: envio.criadoEm.toISOString(),
    iniciadoEm: envio.iniciadoEm?.toISOString() ?? null,
    finalizadoEm: envio.finalizadoEm?.toISOString() ?? null,
    ultimoHeartbeat: envio.ultimoHeartbeat?.toISOString() ?? null,
    erroGeral: envio.erroGeral ?? null,
    envioOrigemId: envio.envioOrigemId ?? null,
  };
}

export function mapEnvioItem(item: ArcoEnvioItem) {
  return {
    id: item.id,
    envioId: item.envioId,
    codigo: item.codigo,
    status: item.status,
    erro: item.erro ?? null,
  };
}

export function mapEnvioComItens(envio: ArcoEnvio, itens: ArcoEnvioItem[]) {
  return {
    ...mapEnvio(envio),
    itens: itens.map(mapEnvioItem),
  };
}
