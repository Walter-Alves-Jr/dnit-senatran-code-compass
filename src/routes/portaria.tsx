import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PORTARIA as portaria } from "@/lib/portaria";

export const Route = createFileRoute("/portaria")({
  head: () => ({
    meta: [
      { title: "Catálogo SENATRAN 268/2022 | Composições homologadas" },
      { name: "description", content: "Todas as composições homologadas da Portaria SENATRAN 268/2022 com imagem, pesos por eixo e PBTC." },
      { property: "og:title", content: "Catálogo SENATRAN 268/2022" },
      { property: "og:description", content: "Todas as composições da portaria com imagem e pesos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Catalogo,
});

type Item = (typeof portaria)[number];
const items = portaria as Item[];
const families = Array.from(new Map(items.map((i) => [i.familyKey, i.family.replace(" (necessita de AET)", "")])).entries());

function Catalogo() {
  const [fam, setFam] = useState<string>("all");
  const [aet, setAet] = useState<"all" | "sim" | "nao">("all");
  const [q, setQ] = useState("");
  const list = useMemo(
    () =>
      items.filter(
        (i) =>
          (fam === "all" || i.familyKey === fam) &&
          (aet === "all" || (aet === "sim") === i.code.endsWith("+")) &&
          (q === "" || `${i.code} ${i.family} ${i.formula}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [fam, aet, q],
  );

  return (
    <div className="min-h-screen">
      <div className="h-3 bg-stripe" />
      <header className="bg-secondary text-secondary-foreground">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <nav className="mb-6 flex gap-4 font-display text-sm font-bold uppercase tracking-wider">
            <Link to="/" className="opacity-70 hover:opacity-100">De-para</Link>
            <Link to="/portaria" className="text-primary">Catálogo da portaria</Link>
          </nav>
          <p className="font-display text-sm font-bold uppercase tracking-[0.3em] text-primary">Portaria SENATRAN nº 268/2022 · Anexo I</p>
          <h1 className="mt-2 font-display text-5xl font-extrabold uppercase leading-none md:text-6xl">Composições homologadas</h1>
          <p className="mt-3 text-secondary-foreground/75">{items.length} classificações de caminhões e ônibus, com a imagem oficial do anexo.</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar código ou descrição (ex.: CTS10, Bitrem, 74)"
              className="h-12 w-full rounded-md border-2 border-secondary bg-card pl-11 pr-4 outline-none focus:border-ring"
            />
          </div>
          <select value={aet} onChange={(e) => setAet(e.target.value as typeof aet)} className="h-12 rounded-md border-2 border-secondary bg-card px-3 font-medium">
            <option value="all">Com e sem AET</option>
            <option value="nao">Sem AET</option>
            <option value="sim">Necessita de AET</option>
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[["all", "Todas"] as const, ...families].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFam(k)}
              className={`rounded-full border-2 px-3 py-1 text-sm font-semibold transition ${fam === k ? "border-secondary bg-secondary text-secondary-foreground" : "border-border bg-card hover:border-secondary"}`}
            >
              {k === "all" ? label : `${k} · ${label}`}
            </button>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted-foreground">{list.length} resultado(s)</p>
        <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((i) => (
            <article key={i.code} className="overflow-hidden rounded-lg border-2 border-secondary bg-card">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <span className="rounded bg-primary px-2.5 py-1 font-display text-2xl font-extrabold leading-none text-primary-foreground">{i.code}</span>
                <span className="text-right text-xs font-medium text-muted-foreground">{i.family}</span>
              </div>
              <div className="flex h-28 items-center justify-center bg-card p-3">
                <img src={i.img} alt={`Composição ${i.code}`} loading="lazy" className="max-h-full max-w-full object-contain" />
              </div>
              <dl className="grid grid-cols-[1fr_auto] gap-3 border-t border-border bg-muted px-4 py-3">
                <div>
                  <dt className="font-display text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Peso por eixo/conjunto (t)</dt>
                  <dd className="font-display text-lg font-bold">{i.formula}</dd>
                </div>
                <div className="text-right">
                  <dt className="font-display text-[11px] font-bold uppercase tracking-wider text-muted-foreground">PBTC máx.</dt>
                  <dd className="font-display text-lg font-bold">{i.pbtc} t</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
