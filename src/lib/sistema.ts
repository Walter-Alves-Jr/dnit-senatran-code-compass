import raw from "@/data/sistema.json";
import { PORTARIA, type PortariaItem } from "@/lib/portaria";
import { VEHICLE_TO_SENATRAN } from "@/lib/senatran";

export type SistemaVeiculo = {
  id: number;
  denominacao: string;
  peso_bruto: number;
  eixos: number;
  codigo_erp: string | null;
  tipo_equipamento: number;
  codigo: string | null;
};

const axlesOf = (t: number) => (t === 25.5 ? 3 : [12, 13, 13.5, 14.5, 17, 18].includes(t) ? 2 : 1);

export function portariaAxles(p: PortariaItem) {
  const ws = p.formula.split("=")[0]!.split("+").map((s) => Number(s.trim().replace(",", ".")));
  return ws.reduce((a, w) => a + axlesOf(w), 0);
}
const pbtcNum = (p: PortariaItem) => Number(p.pbtc.replace(",", "."));

export type Match = { item?: PortariaItem; quality: "exata" | "ajustada" | "aproximada" | "sem"; note: string };

// Regra: usa o código sugerido para o tipo de equipamento; se o nº de eixos não bater,
// procura na mesma família da portaria o código com o mesmo nº de eixos e PBTC mais próximo.
export function matchVeiculo(v: SistemaVeiculo): Match {
  const sug = VEHICLE_TO_SENATRAN[v.tipo_equipamento];
  const base = sug ? PORTARIA.find((p) => p.code === sug.code) : undefined;
  if (!base) return { quality: "sem", note: "Tipo de equipamento sem classificação de carga na portaria." };
  if (portariaAxles(base) === v.eixos)
    return { item: base, quality: sug!.approx ? "aproximada" : "exata", note: sug!.approx ? "Código mais próximo; sem correspondência exata." : "Eixos e tipo conferem com a portaria." };
  const fam = base.familyKey;
  const cands = PORTARIA.filter((p) => p.familyKey === fam && portariaAxles(p) === v.eixos);
  const pool = cands.length ? cands : PORTARIA.filter((p) => !p.familyKey.startsWith("O") && portariaAxles(p) === v.eixos);
  if (!pool.length) return { item: base, quality: "aproximada", note: `Nenhum código com ${v.eixos} eixos; mantido ${base.code}.` };
  const best = pool.reduce((a, b) => (Math.abs(pbtcNum(b) - v.peso_bruto) < Math.abs(pbtcNum(a) - v.peso_bruto) ? b : a));
  return { item: best, quality: cands.length ? "ajustada" : "aproximada", note: `Ajustado para ${v.eixos} eixos e PBT mais próximo de ${String(v.peso_bruto).replace(".", ",")} t.` };
}

export const SISTEMA = (raw as SistemaVeiculo[]).map((v) => ({ ...v, match: matchVeiculo(v) }));
