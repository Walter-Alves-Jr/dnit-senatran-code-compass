import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Combobox } from "@/components/Combobox";
import { ImportDialog } from "@/components/ImportDialog";
import { Button } from "@/components/ui/button";
import { SISTEMA, matchVeiculo, type SistemaVeiculo } from "@/lib/sistema";
import { PORTARIA } from "@/lib/portaria";
import { CATALOG_SOURCE, CATALOG_VERSION, FILTERS, STATUS, finalStatus, type ExportFilter, type Review, type Status } from "@/lib/validation";
import { downloadBlob, toCsv, toXlsx, type ExportRow } from "@/lib/export";

export const Route = createFileRoute("/sistema")({
  head: () => ({
    meta: [
      { title: "De-para dos veículos do sistema | SENATRAN 268/2022" },
      { name: "description", content: "Veículos do ERP ligados à classificação SENATRAN, com revisão, importação e exportação em Excel e CSV." },
      { property: "og:title", content: "De-para dos veículos do sistema" },
      { property: "og:description", content: "Cada veículo do sistema com seu código SENATRAN sugerido, status de revisão e exportação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Sistema,
});

const fmt = (n: number) => (Number.isNaN(n) ? "—" : String(n).replace(".", ","));
const LS_REVIEWS = "cc.reviews.v1";
const LS_IMPORTED = "cc.imported.v1";
const ORDER: Status[] = ["sugestao", "pendente", "divergencia", "sem", "confirmado", "validado"];

type Rec = SistemaVeiculo & { origem: "sistema" | "importado"; key: string; match: ReturnType<typeof matchVeiculo> };

function Badge({ s, small }: { s: Status; small?: boolean }) {
  return <span title={STATUS[s].help} className={`whitespace-nowrap rounded-full font-semibold ${small ? "px-2 py-0.5 text-xs" : "px-3 py-1"} ${STATUS[s].cls}`}>{STATUS[s].label}</span>;
}

function Sistema() {
  const [sel, setSel] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [imported, setImported] = useState<SistemaVeiculo[]>([]);
  const [filter, setFilter] = useState<ExportFilter>("todos");
  const [sep, setSep] = useState<";" | ",">(";");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setReviews(JSON.parse(localStorage.getItem(LS_REVIEWS) ?? "{}"));
      setImported(JSON.parse(localStorage.getItem(LS_IMPORTED) ?? "[]").map((v: SistemaVeiculo) => ({ ...v, peso_bruto: v.peso_bruto ?? NaN })));
    } catch { /* dados locais corrompidos: começa vazio */ }
  }, []);
  const saveReviews = (r: Record<string, Review>) => { setReviews(r); localStorage.setItem(LS_REVIEWS, JSON.stringify(r)); };
  const saveImported = (r: SistemaVeiculo[]) => { setImported(r); localStorage.setItem(LS_IMPORTED, JSON.stringify(r)); };

  const all: Rec[] = useMemo(() => [
    ...SISTEMA.map((v) => ({ ...v, origem: "sistema" as const, key: `s:${v.id}` })),
    ...imported.map((v) => ({ ...v, origem: "importado" as const, key: `i:${v.codigo_erp}`, match: matchVeiculo(v) })),
  ], [imported]);
  const statusOf = (r: Rec) => finalStatus(r.match, reviews[r.key]);
  const codeOf = (r: Rec) => reviews[r.key]?.code ?? r.match.item?.code ?? null;

  const options = all.map((v) => ({ value: v.key, label: v.denominacao, hint: v.codigo_erp ?? "" }));
  const v = all.find((x) => x.key === sel);
  const list = all.filter((x) => `${x.denominacao} ${x.codigo_erp} ${codeOf(x) ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const counts = all.reduce<Record<string, number>>((a, x) => ((a[statusOf(x)] = (a[statusOf(x)] ?? 0) + 1), a), {});
  const toExport = list.filter((x) => FILTERS[filter].has.includes(statusOf(x)));

  function rows(): { headers: string[]; data: ExportRow[] } {
    const headers = ["Código ERP", "Descrição ERP", "Origem", "Eixos", "PBT sistema (t)", "Família / tipo de composição", "Peso por eixo (portaria)", "Código SENATRAN sugerido", "Código SENATRAN validado", "Status de validação", "Origem da validação", "Data da validação", "Critério da sugestão", "Fonte normativa", "Versão do catálogo", "Observações"];
    const data = toExport.map((x) => {
      const r = reviews[x.key];
      return {
        "Código ERP": x.codigo_erp ?? "",
        "Descrição ERP": x.denominacao,
        Origem: x.origem === "sistema" ? "Cadastro do sistema" : "Importado",
        Eixos: x.eixos,
        "PBT sistema (t)": Number.isNaN(x.peso_bruto) ? "" : x.peso_bruto,
        "Família / tipo de composição": x.match.item?.family ?? "",
        "Peso por eixo (portaria)": x.match.item?.formula ?? "",
        "Código SENATRAN sugerido": x.match.item?.code ?? "",
        "Código SENATRAN validado": r?.status === "confirmado" ? r.code ?? "" : "",
        "Status de validação": STATUS[statusOf(x)].label,
        "Origem da validação": r ? "Manual" : "Automática (sugestão)",
        "Data da validação": r ? r.date.slice(0, 10) : "",
        "Critério da sugestão": x.match.note,
        "Fonte normativa": CATALOG_SOURCE,
        "Versão do catálogo": CATALOG_VERSION,
        Observações: r?.note ?? "",
      };
    });
    return { headers, data };
  }
  const stamp = () => new Date().toISOString().slice(0, 10);
  function exportCsv() {
    const { headers, data } = rows();
    downloadBlob(new Blob([toCsv(headers, data, sep)], { type: "text/csv;charset=utf-8" }), `de-para-senatran-${filter}-${stamp()}.csv`);
  }
  async function exportXlsx() {
    setBusy(true);
    try {
      const { headers, data } = rows();
      const summary = ORDER.map((s) => [STATUS[s].label, toExport.filter((x) => statusOf(x) === s).length] as [string, number]);
      const blob = await toXlsx(headers, data, summary, [["Filtro", FILTERS[filter].label], ["Fonte", CATALOG_SOURCE], ["Versão", CATALOG_VERSION], ["Gerado em", new Date().toLocaleString("pt-BR")], ["Aviso", "Códigos sugeridos não são classificação oficial."]]);
      downloadBlob(blob, `de-para-senatran-${filter}-${stamp()}.xlsx`);
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen">
      <div className="h-3 bg-stripe" />
      <header className="bg-secondary text-secondary-foreground">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <nav className="mb-6 flex flex-wrap gap-4 font-display text-sm font-bold uppercase tracking-wider">
            <Link to="/" className="opacity-70 hover:opacity-100">De-para B3/SAP</Link>
            <Link to="/sistema" className="text-primary">Veículos do sistema</Link>
            <Link to="/portaria" className="opacity-70 hover:opacity-100">Catálogo da portaria</Link>
          </nav>
          <p className="font-display text-sm font-bold uppercase tracking-[0.3em] text-primary">Portaria SENATRAN nº 268/2022</p>
          <h1 className="mt-2 font-display text-5xl font-extrabold uppercase leading-none md:text-6xl">Veículos do sistema</h1>
          <p className="mt-3 max-w-2xl text-secondary-foreground/75">{all.length} veículos. Os códigos são <strong>sugestões</strong> calculadas por tipo, eixos e peso — ainda não foram conferidos com uma lista oficial do DNIT/SENATRAN.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            {ORDER.map((k) => <span key={k} title={STATUS[k].help} className={`rounded-full px-3 py-1 font-semibold ${STATUS[k].cls}`}>{STATUS[k].label}: {counts[k] ?? 0}</span>)}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <label className="mb-2 block font-display text-sm font-bold uppercase tracking-wider">1. Selecione o veículo</label>
        <Combobox options={options} value={sel} onChange={setSel} placeholder="Buscar por nome ou código ERP..." />

        {v && (
          <section className="mt-6 overflow-hidden rounded-lg border-2 border-secondary bg-card">
            <div className="grid md:grid-cols-[1fr_auto]">
              <div className="p-6">
                <p className="text-sm text-muted-foreground">ERP {v.codigo_erp} · {v.origem === "sistema" ? `ID ${v.id}` : "importado"}</p>
                <h2 className="font-display text-3xl font-bold">{v.denominacao}</h2>
                <p className="mt-1 text-muted-foreground">{v.match.item?.family ?? "—"}</p>
              </div>
              <div className="flex flex-col justify-center bg-primary px-8 py-6 text-primary-foreground">
                <span className="font-display text-xs font-bold uppercase tracking-[0.25em]">{reviews[v.key]?.status === "confirmado" ? "Código confirmado" : "Código sugerido"}</span>
                <span className="font-display text-6xl font-extrabold leading-none">{codeOf(v) ?? "—"}</span>
              </div>
            </div>
            {v.match.item && (
              <div className="border-y border-border bg-background p-6">
                <img src={PORTARIA.find((p) => p.code === codeOf(v))?.img ?? v.match.item.img} alt={`Composição ${codeOf(v)} — imagem oficial da portaria`} className="mx-auto max-h-36 w-auto" />
                <p className="mt-2 text-center text-xs text-muted-foreground">Imagem oficial · {CATALOG_SOURCE}</p>
              </div>
            )}
            <dl className="grid grid-cols-2 md:grid-cols-4">
              <Stat label="Eixos (sistema)" value={String(v.eixos)} />
              <Stat label="PBT sistema" value={`${fmt(v.peso_bruto)} t`} />
              <Stat label="Peso por eixo (portaria)" value={v.match.item?.formula ?? "—"} />
              <Stat label="PBTC portaria" value={v.match.item ? `${v.match.item.pbtc} t` : "—"} />
            </dl>
            <div className="flex flex-wrap items-center gap-3 border-t border-border bg-muted px-6 py-4 text-sm">
              <Badge s={statusOf(v)} />
              <span><strong>Por que este código:</strong> {v.match.note}</span>
            </div>
            <ReviewPanel key={v.key} rec={v} review={reviews[v.key]} onSave={(r) => {
              const next = { ...reviews };
              if (r) next[v.key] = r; else delete next[v.key];
              saveReviews(next);
            }} />
          </section>
        )}

        <section className="mt-12 rounded-lg border-2 border-secondary bg-card p-5">
          <h2 className="font-display text-2xl font-bold uppercase">Importar e exportar</h2>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <ImportDialog existingErp={new Set(all.map((x) => (x.codigo_erp ?? "").toUpperCase()))} onConfirm={(r) => saveImported([...imported, ...r.map((x, i) => ({ ...x, id: -(imported.length + i + 1) }))])} />
            {imported.length > 0 && <Button variant="ghost" onClick={() => { if (confirm(`Remover os ${imported.length} veículos importados?`)) saveImported([]); }}>Remover importados ({imported.length})</Button>}
          </div>
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <label className="text-sm"><span className="font-semibold">Exportar</span>
              <select aria-label="Filtro de exportação" value={filter} onChange={(e) => setFilter(e.target.value as ExportFilter)} className="mt-1 block h-10 rounded-md border-2 border-secondary bg-card px-2">
                {(Object.keys(FILTERS) as ExportFilter[]).map((k) => <option key={k} value={k}>{FILTERS[k].label}</option>)}
              </select>
            </label>
            <label className="text-sm"><span className="font-semibold">Separador do CSV</span>
              <select aria-label="Separador do CSV" value={sep} onChange={(e) => setSep(e.target.value as ";" | ",")} className="mt-1 block h-10 rounded-md border-2 border-secondary bg-card px-2">
                <option value=";">Ponto e vírgula (Excel Brasil)</option>
                <option value=",">Vírgula</option>
              </select>
            </label>
            <Button disabled={!toExport.length || busy} onClick={exportXlsx}><Download className="mr-2 h-4 w-4" />Excel (.xlsx)</Button>
            <Button variant="outline" className="border-2 border-secondary" disabled={!toExport.length} onClick={exportCsv}><Download className="mr-2 h-4 w-4" />CSV</Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
            {toExport.length ? `${toExport.length} registros serão exportados${q ? " (respeitando o filtro da tabela)" : ""}.` : "Nenhum registro para exportar com esse filtro."}
          </p>
        </section>

        <div className="mt-12 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-bold uppercase">Tabela completa</h2>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar..." aria-label="Filtrar tabela" className="h-11 w-full rounded-md border-2 border-secondary bg-card pl-9 pr-3 outline-none focus:border-ring" />
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border-2 border-secondary bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left font-display uppercase tracking-wider text-secondary-foreground">
              <tr>
                <th className="px-4 py-3">ERP</th>
                <th className="px-4 py-3">Veículo do sistema</th>
                <th className="px-4 py-3 text-center">Eixos</th>
                <th className="px-4 py-3 text-right">PBT</th>
                <th className="px-4 py-3">SENATRAN</th>
                <th className="px-4 py-3">Imagem</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((x) => (
                <tr key={x.key} onClick={() => { setSel(x.key); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="cursor-pointer border-t border-border hover:bg-accent">
                  <td className="px-4 py-2 font-display font-bold">{x.codigo_erp}</td>
                  <td className="px-4 py-2">{x.denominacao}{x.origem === "importado" && <span className="ml-2 text-xs text-muted-foreground">(importado)</span>}</td>
                  <td className="px-4 py-2 text-center">{x.eixos}</td>
                  <td className="px-4 py-2 text-right">{fmt(x.peso_bruto)} t</td>
                  <td className="px-4 py-2 font-display text-lg font-extrabold">{codeOf(x) ?? "—"}</td>
                  <td className="px-4 py-2">{x.match.item && <img src={x.match.item.img} alt="" loading="lazy" className="h-8 w-auto max-w-[220px] object-contain" />}</td>
                  <td className="px-4 py-2"><Badge s={statusOf(x)} small /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">Revisões e importações ficam salvas só neste navegador. Para guardar ou compartilhar, exporte o Excel. Projeto independente — não é ferramenta oficial do DNIT nem da SENATRAN.</p>
      </main>
    </div>
  );
}

function ReviewPanel({ rec, review, onSave }: { rec: Rec; review?: Review; onSave: (r: Review | null) => void }) {
  const [code, setCode] = useState(review?.code ?? rec.match.item?.code ?? "");
  const [note, setNote] = useState(review?.note ?? "");
  const save = (status: Review["status"]) => onSave({ status, code: code || null, note, date: new Date().toISOString() });
  return (
    <div className="border-t border-border p-6">
      <h3 className="font-display text-lg font-bold uppercase">2. Revisar</h3>
      <p className="text-sm text-muted-foreground">Confira o código com a portaria e confirme, escolha outro ou marque divergência.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-[200px_1fr]">
        <label className="text-sm"><span className="font-semibold">Código</span>
          <select aria-label="Código para confirmar" value={code} onChange={(e) => setCode(e.target.value)} className="mt-1 block h-10 w-full rounded-md border-2 border-secondary bg-card px-2">
            <option value="">— nenhum —</option>
            {PORTARIA.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.pbtc} t</option>)}
          </select>
        </label>
        <label className="text-sm"><span className="font-semibold">Observação</span>
          <input aria-label="Observação" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: conferido com documento do veículo" className="mt-1 h-10 w-full rounded-md border-2 border-secondary bg-card px-3" />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button disabled={!code} onClick={() => save("confirmado")}>Confirmar código</Button>
        <Button variant="outline" className="border-2 border-secondary" onClick={() => save("divergencia")}>Marcar divergência</Button>
        {review && <Button variant="ghost" onClick={() => onSave(null)}>Desfazer revisão</Button>}
      </div>
      {review && <p className="mt-2 text-xs text-muted-foreground">Revisado em {new Date(review.date).toLocaleString("pt-BR")}.</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border p-5 md:border-l">
      <dt className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display text-xl font-bold">{value}</dd>
    </div>
  );
}
