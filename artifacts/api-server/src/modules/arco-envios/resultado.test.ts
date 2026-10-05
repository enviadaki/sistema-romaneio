import { describe, expect, it } from "vitest";
import { computeEnvioResultado } from "./resultado";

describe("computeEnvioResultado", () => {
  it("concluido: todos os códigos reportados como ok e sem erro_geral", () => {
    const result = computeEnvioResultado({
      codigosEsperados: ["A1", "A2"],
      itensReportados: [{ codigo: "A1", ok: true }, { codigo: "A2", ok: true }],
    });
    expect(result.envioStatus).toBe("concluido");
    expect(result.itens).toEqual([
      { codigo: "A1", status: "ok", erro: null },
      { codigo: "A2", status: "ok", erro: null },
    ]);
  });

  it("concluido_com_erros: pelo menos um ok e pelo menos um erro", () => {
    const result = computeEnvioResultado({
      codigosEsperados: ["A1", "A2"],
      itensReportados: [{ codigo: "A1", ok: true }, { codigo: "A2", ok: false, erro: "não encontrado" }],
    });
    expect(result.envioStatus).toBe("concluido_com_erros");
    expect(result.itens).toEqual([
      { codigo: "A1", status: "ok", erro: null },
      { codigo: "A2", status: "erro", erro: "não encontrado" },
    ]);
  });

  it("concluido_com_erros: código ausente do relatório do agente vira nao_processado", () => {
    const result = computeEnvioResultado({
      codigosEsperados: ["A1", "A2", "A3"],
      itensReportados: [{ codigo: "A1", ok: true }],
    });
    expect(result.envioStatus).toBe("concluido_com_erros");
    expect(result.itens).toEqual([
      { codigo: "A1", status: "ok", erro: null },
      { codigo: "A2", status: "nao_processado", erro: null },
      { codigo: "A3", status: "nao_processado", erro: null },
    ]);
  });

  it("falhou: nenhum código ok", () => {
    const result = computeEnvioResultado({
      codigosEsperados: ["A1", "A2"],
      itensReportados: [{ codigo: "A1", ok: false, erro: "erro 1" }, { codigo: "A2", ok: false, erro: "erro 2" }],
    });
    expect(result.envioStatus).toBe("falhou");
  });

  it("falhou: lista de itens reportados vazia (nenhum processado)", () => {
    const result = computeEnvioResultado({
      codigosEsperados: ["A1", "A2"],
      itensReportados: [],
    });
    expect(result.envioStatus).toBe("falhou");
    expect(result.itens.every((i) => i.status === "nao_processado")).toBe(true);
  });

  it("falhou: erro_geral de abertura mesmo com itens ok (prioridade sobre o restante)", () => {
    const result = computeEnvioResultado({
      codigosEsperados: ["A1", "A2"],
      itensReportados: [{ codigo: "A1", ok: true }, { codigo: "A2", ok: true }],
      erroGeral: "Falha ao abrir o site da Loggi",
    });
    expect(result.envioStatus).toBe("falhou");
  });

  it("falhou: erro_geral BOTOES_FINAIS mantém os itens individuais como ok (pra UI destacar bipado-mas-não-finalizado)", () => {
    const result = computeEnvioResultado({
      codigosEsperados: ["A1", "A2"],
      itensReportados: [{ codigo: "A1", ok: true }, { codigo: "A2", ok: true }],
      erroGeral: "BOTOES_FINAIS: não encontrou o botão de finalizar",
    });
    expect(result.envioStatus).toBe("falhou");
    expect(result.itens).toEqual([
      { codigo: "A1", status: "ok", erro: null },
      { codigo: "A2", status: "ok", erro: null },
    ]);
  });

  it("erro_geral em branco é tratado como ausente", () => {
    const result = computeEnvioResultado({
      codigosEsperados: ["A1"],
      itensReportados: [{ codigo: "A1", ok: true }],
      erroGeral: "   ",
    });
    expect(result.envioStatus).toBe("concluido");
  });
});
