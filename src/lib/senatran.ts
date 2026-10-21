// Classificação SENATRAN (Portaria 268/2022 - Anexo I) e correspondência sugerida
// para os tipos de veículo da planilha de-para.

export type UnitType = "caminhao" | "trator" | "semirreboque" | "reboque";
export type AxleGroup = { axles: number; t: number };
export type Unit = { type: UnitType; groups: AxleGroup[] };
export type SenatranCode = {
  code: string;
  family: string;
  formula: string;
  pbtc: number;
  comprimento: number;
  aet: boolean;
  units: Unit[];
};

const FAMILIES: Record<string, { name: string; split: UnitType[][] }> = {
  C: { name: "Caminhão", split: [["caminhao"]] },
  CTS: { name: "Caminhão Trator + Semirreboque", split: [["trator"], ["semirreboque"]] },
  CR: { name: "Caminhão + Reboque", split: [["caminhao"], ["reboque"]] },
  CTSS: { name: "Caminhão Trator + 2 Semirreboques", split: [["trator"], ["semirreboque"], ["semirreboque"]] },
  CTSR: { name: "Caminhão Trator + Semirreboque + Reboque", split: [["trator"], ["semirreboque"], ["reboque"]] },
  CRR: { name: "Caminhão + 2 Reboques", split: [["caminhao"], ["reboque"], ["reboque"]] },
  CTSSS: { name: "Caminhão Trator + 3 Semirreboques", split: [["trator"], ["semirreboque"], ["semirreboque"], ["semirreboque"]] },
};

const axlesFor = (t: number) => (t === 25.5 ? 3 : t === 12 || t === 13 || t === 13.5 || t === 17 ? 2 : 1);

// groups per unit, in order
function build(code: string, weights: number[], perUnit: number[]): SenatranCode {
  const fam = code.match(/^[A-Z]+/)![0];
  const f = FAMILIES[fam]!;
  const aet = code.endsWith("+");
  let i = 0;
  const units: Unit[] = perUnit.map((n, u) => {
    const groups = weights.slice(i, i + n).map((t) => ({ t, axles: axlesFor(t) }));
    i += n;
    return { type: f.split[u][0], groups };
  });
  const pbtc = weights.reduce((a, b) => a + b, 0);
  const comprimento = aet ? 30 : fam === "C" ? 14 : fam === "CTS" ? 18.6 : 19.8;
  const fmt = (n: number) => String(n).replace(".", ",");
  return {
    code,
    family: f.name + (aet ? " (necessita de AET)" : ""),
    formula: `${weights.map(fmt).join(" + ")} = ${fmt(pbtc)}`,
    pbtc,
    comprimento,
    aet,
    units,
  };
}

export const CODES: Record<string, SenatranCode> = Object.fromEntries(
  [
    build("C1", [6, 6], [2]),
    build("C2", [6, 10], [2]),
    build("C3", [6, 17], [2]),
    build("C7", [12, 17], [2]),
    build("CTS1", [6, 10, 10], [2, 1]),
    build("CTS2", [6, 10, 17], [2, 1]),
    build("CTS3", [6, 10, 10, 10], [2, 2]),
    build("CTS4", [6, 10, 25.5], [2, 1]),
    build("CTS5", [6, 10, 10, 17], [2, 2]),
    build("CTS6", [6, 10, 10, 10, 10], [2, 3]),
    build("CTS7", [6, 17, 10], [2, 1]),
    build("CTS8", [6, 17, 10, 10], [2, 2]),
    build("CTS10", [6, 17, 25.5], [2, 1]),
    build("CTS11", [6, 17, 10, 25.5], [2, 2]),
    build("CTS13", [6, 17, 10, 17], [2, 2]),
    build("CTS15", [6, 17, 10, 10, 10], [2, 3]),
    build("CTS19", [6, 17, 17], [2, 1]),
    build("CTS22", [12, 17, 25.5], [2, 1]),
    build("CR1", [6, 10, 10, 10], [2, 2]),
    build("CR2", [6, 10, 10, 17], [2, 2]),
    build("CR4", [6, 17, 10, 10], [2, 2]),
    build("CR5", [6, 17, 10, 17], [2, 2]),
    build("CR6", [6, 17, 17, 17], [2, 2]),
    build("CTSS8", [6, 17, 17, 17], [2, 1, 1]),
    build("CTSS10+", [6, 17, 17, 25.5], [2, 1, 1]),
    build("CTSS11+", [6, 17, 25.5, 17], [2, 1, 1]),
    build("CTSS12+", [6, 17, 25.5, 25.5], [2, 1, 1]),
    build("CTSS13+", [12, 17, 17, 17], [2, 1, 1]),
    build("CTSR6+", [6, 17, 17, 17, 17], [2, 1, 2]),
    build("CRR1+", [6, 17, 10, 10, 10, 10], [2, 2, 2]),
    build("CRR2+", [6, 17, 10, 10, 10, 17], [2, 2, 2]),
    build("CTSSS7+", [6, 17, 17, 17, 17], [2, 1, 1, 1]),
  ].map((c) => [c.code, c]),
);

// Tipo de veículo (planilha) -> código SENATRAN sugerido. approx = sem correspondência exata na portaria.
export const VEHICLE_TO_SENATRAN: Record<number, { code: string; approx?: boolean }> = {
  1: { code: "C2" },
  2: { code: "C3" },
  3: { code: "CTS1" },
  4: { code: "C7", approx: true },
  5: { code: "C7" },
  6: { code: "CTS2" },
  7: { code: "CTS3" },
  8: { code: "CTS7" },
  9: { code: "CR1" },
  10: { code: "CTS4" },
  11: { code: "CTS19" },
  12: { code: "CTS6" },
  13: { code: "CTS5" },
  14: { code: "CTS8" },
  15: { code: "CR2" },
  16: { code: "CR4" },
  17: { code: "CTS10" },
  18: { code: "CTS15" },
  19: { code: "CTS13" },
  20: { code: "CTSS8" },
  21: { code: "CR5" },
  22: { code: "CR6" },
  23: { code: "CRR1+" },
  24: { code: "CTSR6+" },
  25: { code: "CTSSS7+" },
  26: { code: "CTSS12+" },
  27: { code: "CRR2+", approx: true },
  28: { code: "CRR2+", approx: true },
  29: { code: "CTS11" },
  30: { code: "C7", approx: true },
  31: { code: "CTSS10+" },
  32: { code: "CTSS11+" },
  33: { code: "CTS22", approx: true },
  34: { code: "C1" },
  35: { code: "C1", approx: true },
  36: { code: "CTS10" },
  37: { code: "CTSS13+" },
};

export const totalAxles = (c: SenatranCode) =>
  c.units.reduce((a, u) => a + u.groups.reduce((b, g) => b + g.axles, 0), 0);
