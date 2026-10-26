import { describe, expect, it } from "vitest";
import { toCsv, safeText } from "@/lib/export";
import { buildRecords, guessMapping, parseCsv } from "@/lib/importer";
import { SISTEMA, matchVeiculo } from "@/lib/sistema";
import { autoStatus, finalStatus } from "@/lib/validation";

describe("status de validação", () => {
  it("nenhum código automático sai como validado ou confirmado", () => {
    const s = new Set(SISTEMA.map((v) => autoStatus(v.match)));
    expect(s.has("validado")).toBe(false);
    expect(s.has("confirmado")).toBe(false);
  });
  it("correspondência exata é só sugestão; aproximada é divergência", () => {
    expect(autoStatus({ quality: "exata", note: "" })).toBe("sugestao");
    expect(autoStatus({ quality: "ajustada", note: "" })).toBe("pendente");
    expect(autoStatus({ quality: "aproximada", note: "" })).toBe("divergencia");
  });
  it("revisão manual prevalece", () => {
    expect(finalStatus({ quality: "exata", note: "" }, { status: "confirmado", code: "CTS2", note: "", date: "" })).toBe("confirmado");
  });
  it("veículo importado sem tipo nunca vira correspondência exata", () => {
    const m = matchVeiculo({ id: -1, denominacao: "X", peso_bruto: 33, eixos: 4, codigo_erp: "Z", tipo_equipamento: 0, codigo: null });
    expect(m.quality).toBe("aproximada");
  });
});

describe("CSV", () => {
  it("escapa aspas, separador e quebra de linha e preserva acentos", () => {
    const csv = toCsv(["a", "b"], [{ a: 'Caminhão "6x2"; truck', b: "linha1\nlinha2" }], ";");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Caminhão ""6x2""; truck";"linha1\nlinha2"');
    expect(parseCsv(csv).rows[0]).toEqual(['Caminhão "6x2"; truck', "linha1\nlinha2"]);
  });
  it("mantém código com zero à esquerda como texto e neutraliza fórmula", () => {
    expect(toCsv(["c"], [{ c: "007" }])).toContain("007");
    expect(safeText("=SOMA(A1)")).toBe("'=SOMA(A1)");
  });
});

describe("importação", () => {
  it("valida obrigatórios, eixos e duplicados", () => {
    const t = parseCsv("codigo;descricao;eixos;peso\nA1;Truck;3;23\n;Sem código;3;23\nA2;Ruim;x;1\nA1;Dup;3;23");
    const r = buildRecords(t, guessMapping(t.headers));
    expect(r.records).toHaveLength(1);
    expect(r.errors.map((e) => e.line)).toEqual([3, 4, 5]);
    expect(r.duplicates).toBe(1);
  });
});
