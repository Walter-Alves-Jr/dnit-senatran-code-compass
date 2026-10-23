export type ExportRow = Record<string, string | number | null | undefined>;

/** Evita que o Excel interprete textos como fórmula (=, +, -, @, tab, CR). */
export function safeText(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

function csvCell(v: unknown, sep: string): string {
  const s = typeof v === "number" ? String(v).replace(".", sep === ";" ? "," : ".") : safeText(v);
  return /["\r\n]/.test(s) || s.includes(sep) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV UTF-8 com BOM, cabeçalhos fixos e escape de aspas, separador e quebras de linha. */
export function toCsv(headers: string[], rows: ExportRow[], sep: ";" | "," = ";"): string {
  const lines = [headers.map((h) => csvCell(h, sep)).join(sep)];
  for (const r of rows) lines.push(headers.map((h) => csvCell(r[h], sep)).join(sep));
  return "\uFEFF" + lines.join("\r\n");
}

export async function toXlsx(headers: string[], rows: ExportRow[], summary: [string, number][], meta: [string, string][]): Promise<Blob> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("De-para");
  ws.columns = headers.map((h) => ({ header: h, key: h, width: Math.min(60, Math.max(12, h.length + 4)) }));
  for (const r of rows) {
    const row: Record<string, string | number> = {};
    for (const h of headers) {
      const v = r[h];
      row[h] = typeof v === "number" ? v : safeText(v);
    }
    ws.addRow(row);
  }
  headers.forEach((h, i) => {
    const longest = rows.reduce((m, r) => Math.max(m, String(r[h] ?? "").length), h.length);
    ws.getColumn(i + 1).width = Math.min(60, Math.max(10, longest + 2));
  });
  const head = ws.getRow(1);
  head.font = { bold: true, name: "Arial" };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2C230" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };

  const s = wb.addWorksheet("Resumo");
  s.columns = [{ header: "Status", key: "a", width: 36 }, { header: "Registros", key: "b", width: 12 }];
  summary.forEach(([a, b]) => s.addRow({ a, b }));
  s.addRow({});
  meta.forEach(([a, b]) => s.addRow({ a, b }));
  s.getRow(1).font = { bold: true, name: "Arial" };

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
