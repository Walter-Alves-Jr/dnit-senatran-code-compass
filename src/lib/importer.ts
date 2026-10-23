import type { SistemaVeiculo } from "@/lib/sistema";

export type Table = { headers: string[]; rows: string[][] };

/** Parser CSV com aspas, separador detectado (; , ou tab) e quebras de linha dentro de aspas. */
export function parseCsv(text: string): Table {
  text = text.replace(/^\uFEFF/, "");
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const sep = [";", "\t", ","].reduce((b, c) => (first.split(c).length > first.split(b).length ? c : b), ",");
  const out: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); out.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); out.push(row); }
  const clean = out.filter((r) => r.some((c) => c.trim()));
  return { headers: (clean[0] ?? []).map((h) => h.trim()), rows: clean.slice(1) };
}

export async function parseFile(file: File): Promise<Table> {
  if (/\.xlsx$/i.test(file.name)) {
    const { default: ExcelJS } = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    const ws = wb.worksheets[0];
    if (!ws) return { headers: [], rows: [] };
    const all: string[][] = [];
    ws.eachRow({ includeEmpty: false }, (r) => {
      const vals = (r.values as unknown[]).slice(1).map((v) => {
        if (v == null) return "";
        if (typeof v === "object" && "text" in (v as object)) return String((v as { text: unknown }).text);
        if (typeof v === "object" && "result" in (v as object)) return String((v as { result: unknown }).result ?? "");
        return String(v);
      });
      all.push(vals);
    });
    return { headers: (all[0] ?? []).map((h) => h.trim()), rows: all.slice(1) };
  }
  return parseCsv(await file.text());
}

export const FIELDS = {
  codigo_erp: { label: "Código interno (ERP)", required: true },
  denominacao: { label: "Descrição do veículo", required: true },
  eixos: { label: "Quantidade de eixos", required: true },
  peso_bruto: { label: "Peso bruto (t)", required: false },
  tipo_equipamento: { label: "Tipo de equipamento (nº)", required: false },
} as const;
export type Field = keyof typeof FIELDS;
export type Mapping = Record<Field, number | -1>;

const HINTS: Record<Field, RegExp> = {
  codigo_erp: /erp|c[oó]d(igo)?(_| )?(interno|sap)?$|^id$/i,
  denominacao: /denomina|descri|nome|modelo/i,
  eixos: /eixo/i,
  peso_bruto: /peso|pbt/i,
  tipo_equipamento: /tipo.*equip|equipamento/i,
};

export function guessMapping(headers: string[]): Mapping {
  const m = {} as Mapping;
  const used = new Set<number>();
  (Object.keys(FIELDS) as Field[]).forEach((f) => {
    const idx = headers.findIndex((h, i) => !used.has(i) && HINTS[f].test(h));
    m[f] = idx;
    if (idx >= 0) used.add(idx);
  });
  return m;
}

const num = (s: string | undefined) => {
  if (s == null || !s.trim()) return NaN;
  const t = s.trim().replace(/\s/g, "");
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
};

export type RowError = { line: number; message: string };
export type ImportResult = { records: SistemaVeiculo[]; errors: RowError[]; duplicates: number };

/** Valida linhas: campos obrigatórios, eixos inteiros 2–11, peso positivo, sem códigos ERP repetidos. */
export function buildRecords(t: Table, m: Mapping, existingErp: Set<string> = new Set()): ImportResult {
  const errors: RowError[] = [];
  const records: SistemaVeiculo[] = [];
  const seen = new Set(existingErp);
  let duplicates = 0;
  t.rows.forEach((r, i) => {
    const line = i + 2;
    const get = (f: Field) => (m[f] >= 0 ? (r[m[f]] ?? "").trim() : "");
    const erp = get("codigo_erp"), den = get("denominacao");
    const eixos = num(get("eixos")), peso = num(get("peso_bruto")), tipo = num(get("tipo_equipamento"));
    const miss = (Object.keys(FIELDS) as Field[]).filter((f) => FIELDS[f].required && !get(f));
    if (miss.length) return errors.push({ line, message: `Faltando: ${miss.map((f) => FIELDS[f].label).join(", ")}` });
    if (!Number.isInteger(eixos) || eixos < 2 || eixos > 11) return errors.push({ line, message: `Eixos inválido: "${get("eixos")}"` });
    if (get("peso_bruto") && !(peso > 0)) return errors.push({ line, message: `Peso inválido: "${get("peso_bruto")}"` });
    const key = erp.toUpperCase();
    if (seen.has(key)) { duplicates++; return errors.push({ line, message: `Código ERP repetido: ${erp}` }); }
    seen.add(key);
    records.push({
      id: -(records.length + 1),
      denominacao: den,
      peso_bruto: peso > 0 ? peso : NaN,
      eixos,
      codigo_erp: erp,
      tipo_equipamento: Number.isInteger(tipo) ? tipo : 0,
      codigo: null,
    });
  });
  return { records, errors, duplicates };
}
