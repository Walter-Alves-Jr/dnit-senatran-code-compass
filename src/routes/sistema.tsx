import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Combobox } from "@/components/Combobox";
import { SISTEMA } from "@/lib/sistema";

export const Route = createFileRoute("/sistema")({
  head: () => ({
    meta: [
      { title: "De-para dos veículos do sistema | SENATRAN 268/2022" },
      { name: "description", content: "Veículos cadastrados no sistema ligados à classificação SENATRAN, com imagem oficial da portaria." },
      { property: "og:title", content: "De-para dos veículos do sistema" },
      { property: "og:description", content: "Cada veículo do sistema com seu código SENATRAN e imagem." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Sistema,
});

const QUALITY = {
  exata: { label: "Correspondência exata", cls: "bg-primary text-primary-foreground" },
  ajustada: { label: "Ajustado por eixos", cls: "bg-accent text-accent-foreground" },
  aproximada: { label: "Aproximado — revisar", cls: "bg-warning text-secondary-foreground" },
  sem: { label: "Sem código", cls: "bg-muted text-muted-foreground" },
} as const;

const fmt = (n: number) => String(n).replace(".", ",");

function Sistema() {
  const [sel, setSel] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const options = SISTEMA.map((v) => ({ value: String(v.id), label: v.denominacao, hint: v.codigo_erp ?? "" }));
  const v = SISTEMA.find((x) => String(x.id) === sel);
  const list = useMemo(
    () => SISTEMA.filter((x) => `${x.denominacao} ${x.codigo_erp} ${x.match.item?.code ?? ""}`.toLowerCase().includes(q.toLowerCase())),
    [q],
  );
  const counts = SISTEMA.reduce<Record<string, number>>((a, x) => ((a[x.match.quality] = (a[x.match.quality] ?? 0) + 1), a), {});

  return (
    <div className="min-h-screen">
      <div className="h-3 bg-stripe" />
      <header className="bg-secondary text-secondary-foreground">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <nav className="mb-6 flex gap-4 font-display text-sm font-bold uppercase tracking-wider">
            <Link to="/" className="opacity-70 hover:opacity-100">De-para B3/SAP</Link>
            <Link to="/sistema" className="text-primary">Veículos do sistema</Link>
            <Link to="/portaria" className="opacity-70 hover:opacity-100">Catálogo da portaria</Link>
          </nav>
          <p className="font-display text-sm font-bold uppercase tracking-[0.3em] text-primary">Portaria SENATRAN nº 268/2022</p>
          <h1 className="mt-2 font-display text-5xl font-extrabold uppercase leading-none md:text-6xl">Veículos do sistema</h1>
          <p className="mt-3 text-secondary-foreground/75">{SISTEMA.length} veículos cadastrados ligados ao código SENATRAN.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            {(Object.keys(QUALITY) as (keyof typeof QUALITY)[]).map((k) => (
              <span key={k} className={`rounded-full px-3 py-1 font-semibold ${QUALITY[k].cls}`}>{QUALITY[k].label}: {counts[k] ?? 0}</span>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <label className="mb-2 block font-display text-sm font-bold uppercase tracking-wider">Selecione o veículo</label>
        <Combobox options={options} value={sel} onChange={setSel} placeholder="Buscar por nome ou código ERP..." />

        {v && (
          <section className="mt-6 overflow-hidden rounded-lg border-2 border-secondary bg-card">
            <div className="grid md:grid-cols-[1fr_auto]">
              <div className="p-6">
                <p className="text-sm text-muted-foreground">ERP {v.codigo_erp} · ID {v.id}</p>
                <h2 className="font-display text-3xl font-bold">{v.denominacao}</h2>
                <p className="mt-1 text-muted-foreground">{v.match.item?.family ?? "—"}</p>
              </div>
              <div className="flex flex-col justify-center bg-primary px-8 py-6 text-primary-foreground">
                <span className="font-display text-xs font-bold uppercase tracking-[0.25em]">Código SENATRAN</span>
                <span className="font-display text-6xl font-extrabold leading-none">{v.match.item?.code ?? "—"}</span>
              </div>
            </div>
            {v.match.item && (
              <div className="border-y border-border bg-background p-6">
                <img src={v.match.item.img} alt={`Composição ${v.match.item.code}`} className="mx-auto max-h-36 w-auto" />
              </div>
            )}
            <dl className="grid grid-cols-2 md:grid-cols-4">
              <Stat label="Eixos (sistema)" value={String(v.eixos)} />
              <Stat label="PBT sistema" value={`${fmt(v.peso_bruto)} t`} />
              <Stat label="Peso por eixo (portaria)" value={v.match.item?.formula ?? "—"} />
              <Stat label="PBTC portaria" value={v.match.item ? `${v.match.item.pbtc} t` : "—"} />
            </dl>
            <div className="flex flex-wrap items-center gap-3 border-t border-border bg-muted px-6 py-4 text-sm">
              <span className={`rounded-full px-3 py-1 font-semibold ${QUALITY[v.match.quality].cls}`}>{QUALITY[v.match.quality].label}</span>
              <span>{v.match.note}</span>
            </div>
          </section>
        )}

        <div className="mt-12 flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-bold uppercase">Tabela completa</h2>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar..." className="h-11 w-full rounded-md border-2 border-secondary bg-card pl-9 pr-3 outline-none focus:border-ring" />
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
                <tr key={x.id} onClick={() => { setSel(String(x.id)); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="cursor-pointer border-t border-border hover:bg-accent">
                  <td className="px-4 py-2 font-display font-bold">{x.codigo_erp}</td>
                  <td className="px-4 py-2">{x.denominacao}</td>
                  <td className="px-4 py-2 text-center">{x.eixos}</td>
                  <td className="px-4 py-2 text-right">{fmt(x.peso_bruto)} t</td>
                  <td className="px-4 py-2 font-display text-lg font-extrabold">{x.match.item?.code ?? "—"}</td>
                  <td className="px-4 py-2">{x.match.item && <img src={x.match.item.img} alt="" loading="lazy" className="h-8 w-auto max-w-[220px] object-contain" />}</td>
                  <td className="px-4 py-2"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${QUALITY[x.match.quality].cls}`}>{QUALITY[x.match.quality].label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
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
