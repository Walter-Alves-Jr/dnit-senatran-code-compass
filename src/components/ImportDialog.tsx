import { useState } from "react";
import { Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FIELDS, buildRecords, guessMapping, parseFile, type Field, type Mapping, type Table } from "@/lib/importer";
import type { SistemaVeiculo } from "@/lib/sistema";

export function ImportDialog({ existingErp, onConfirm }: { existingErp: Set<string>; onConfirm: (r: SistemaVeiculo[]) => void }) {
  const [open, setOpen] = useState(false);
  const [table, setTable] = useState<Table | null>(null);
  const [map, setMap] = useState<Mapping | null>(null);
  const [fileName, setFileName] = useState("");
  const [err, setErr] = useState("");

  const reset = () => { setTable(null); setMap(null); setFileName(""); setErr(""); };
  const result = table && map ? buildRecords(table, map, existingErp) : null;
  const missingReq = map ? (Object.keys(FIELDS) as Field[]).filter((f) => FIELDS[f].required && map[f] < 0) : [];

  async function onFile(f: File | undefined) {
    if (!f) return;
    reset();
    setFileName(f.name);
    try {
      const t = await parseFile(f);
      if (!t.headers.length || !t.rows.length) { setErr("Não encontramos linhas nesse arquivo. Confira se a primeira linha tem os nomes das colunas."); return; }
      setTable(t);
      setMap(guessMapping(t.headers));
    } catch {
      setErr("Não conseguimos ler esse arquivo. Use CSV ou Excel (.xlsx).");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-2 border-secondary"><Upload className="mr-2 h-4 w-4" />Importar lista do ERP</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase">Importar veículos</DialogTitle>
          <DialogDescription>Arquivo CSV ou Excel. Na primeira linha, os nomes das colunas. Nada é salvo até você confirmar.</DialogDescription>
        </DialogHeader>

        <input type="file" accept=".csv,.txt,.xlsx" aria-label="Arquivo para importar" onChange={(e) => onFile(e.target.files?.[0])} className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:font-semibold file:text-primary-foreground" />
        {err && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{err}</p>}

        {table && map && (
          <>
            <p className="text-sm text-muted-foreground">{fileName}: {table.rows.length} linhas. Diga qual coluna corresponde a cada informação:</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(FIELDS) as Field[]).map((f) => (
                <label key={f} className="text-sm">
                  <span className="font-semibold">{FIELDS[f].label}{FIELDS[f].required ? " *" : " (opcional)"}</span>
                  <select value={map[f]} onChange={(e) => setMap({ ...map, [f]: Number(e.target.value) })} className="mt-1 h-10 w-full rounded-md border-2 border-secondary bg-card px-2">
                    <option value={-1}>— não tenho —</option>
                    {table.headers.map((h, i) => <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>)}
                  </select>
                </label>
              ))}
            </div>

            {missingReq.length > 0 ? (
              <p className="rounded-md bg-warning/15 p-3 text-sm">Escolha a coluna de: {missingReq.map((f) => FIELDS[f].label).join(", ")}.</p>
            ) : result && (
              <>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-success px-3 py-1 font-semibold text-success-foreground">{result.records.length} prontos</span>
                  <span className="rounded-full bg-warning px-3 py-1 font-semibold text-secondary-foreground">{result.errors.length} com problema</span>
                </div>
                {map.tipo_equipamento < 0 && <p className="text-sm text-muted-foreground">Sem o tipo de equipamento, o código será só um candidato por eixos e peso, marcado como divergência para revisão.</p>}
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted text-left"><tr><th className="p-2">ERP</th><th className="p-2">Descrição</th><th className="p-2">Eixos</th><th className="p-2">Peso</th></tr></thead>
                    <tbody>{result.records.slice(0, 8).map((r) => (
                      <tr key={r.id} className="border-t border-border"><td className="p-2">{r.codigo_erp}</td><td className="p-2">{r.denominacao}</td><td className="p-2">{r.eixos}</td><td className="p-2">{Number.isNaN(r.peso_bruto) ? "—" : r.peso_bruto}</td></tr>
                    ))}</tbody>
                  </table>
                  {result.records.length > 8 && <p className="p-2 text-xs text-muted-foreground">… e mais {result.records.length - 8}</p>}
                </div>
                {result.errors.length > 0 && (
                  <ul className="max-h-40 overflow-y-auto rounded-md bg-muted p-3 text-xs">
                    {result.errors.map((e, i) => <li key={i}>Linha {e.line}: {e.message}</li>)}
                  </ul>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button disabled={!result.records.length} onClick={() => { onConfirm(result.records); setOpen(false); }}>
                    Importar {result.records.length} veículos
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
