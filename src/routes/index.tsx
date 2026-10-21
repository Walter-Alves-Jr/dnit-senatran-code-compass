import { createFileRoute, Link } from "@tanstack/react-router";
import { PORTARIA as portaria } from "@/lib/portaria";
import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import data from "@/data/dexpara.json";
import { Combobox } from "@/components/Combobox";
import { TruckDrawing } from "@/components/TruckDrawing";
import { CODES, VEHICLE_TO_SENATRAN, totalAxles } from "@/lib/senatran";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "De-para de veículos | Classificação SENATRAN" },
      { name: "description", content: "Selecione o veículo e o implemento e veja o código SAP e a classificação SENATRAN (Portaria 268/2022) com o desenho da composição." },
      { property: "og:title", content: "De-para de veículos | Classificação SENATRAN" },
      { property: "og:description", content: "Consulta visual do de-para de veículos para a classificação SENATRAN." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const vehicles = data.vehicles as Record<string, string>;
const implementsMap = data.implements as Record<string, string>;
const rows = data.map as [number, number, string, string][];
const fmt = (n: number) => String(n).replace(".", ",");

function Index() {
  const [veh, setVeh] = useState<string | null>(null);
  const [imp, setImp] = useState<string | null>(null);

  const vehOptions = Object.entries(vehicles).map(([k, v]) => ({ value: k, label: v, hint: k }));
  const impOptions = useMemo(() => {
    if (!veh) return [];
    const ids = new Set(rows.filter((r) => String(r[0]) === veh).map((r) => String(r[1])));
    return Object.entries(implementsMap)
      .filter(([k]) => ids.has(k))
      .map(([k, v]) => ({ value: k, label: v, hint: k }));
  }, [veh]);

  const sap = rows.find((r) => String(r[0]) === veh && String(r[1]) === imp);
  const mapping = veh ? VEHICLE_TO_SENATRAN[Number(veh)] : undefined;
  const code = mapping ? CODES[mapping.code] : undefined;
  const official = code ? portaria.find((p) => p.code === code.code) : undefined;

  return (
    <div className="min-h-screen">
      <div className="h-3 bg-stripe" />
      <header className="bg-secondary text-secondary-foreground">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <nav className="mb-6 flex gap-4 font-display text-sm font-bold uppercase tracking-wider">
            <Link to="/" className="text-primary">De-para</Link>
            <Link to="/portaria" className="opacity-70 hover:opacity-100">Catálogo da portaria</Link>
          </nav>
          <p className="font-display text-sm font-bold uppercase tracking-[0.3em] text-primary">Portaria SENATRAN nº 268/2022</p>
          <h1 className="mt-2 font-display text-5xl font-extrabold uppercase leading-none md:text-6xl">De-para de veículos</h1>
          <p className="mt-3 max-w-2xl text-secondary-foreground/75">
            Selecione o tipo de veículo e o implemento para ver o código SAP e a classificação SENATRAN correspondente.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block font-display text-sm font-bold uppercase tracking-wider">1. Tipo de veículo</label>
            <Combobox options={vehOptions} value={veh} onChange={(v) => { setVeh(v); setImp(null); }} placeholder="Selecione o veículo..." />
          </div>
          <div>
            <label className="mb-2 block font-display text-sm font-bold uppercase tracking-wider">2. Implemento</label>
            <Combobox options={impOptions} value={imp} onChange={setImp} placeholder={veh ? "Selecione o implemento..." : "Escolha o veículo primeiro"} disabled={!veh} />
          </div>
        </section>

        {!veh && (
          <div className="mt-10 rounded-lg border-2 border-dashed border-border p-16 text-center text-muted-foreground">
            Escolha um veículo para visualizar a composição.
          </div>
        )}

        {veh && (
          <section className="mt-10 overflow-hidden rounded-lg border-2 border-secondary bg-card">
            <div className="grid md:grid-cols-[1fr_auto]">
              <div className="p-6">
                <p className="text-sm text-muted-foreground">Veículo {veh}</p>
                <h2 className="font-display text-3xl font-bold">{vehicles[veh]}</h2>
                {code && <p className="mt-1 text-muted-foreground">{code.family}</p>}
              </div>
              <div className="flex flex-col justify-center bg-primary px-8 py-6 text-primary-foreground">
                <span className="font-display text-xs font-bold uppercase tracking-[0.25em]">Código SENATRAN</span>
                <span className="font-display text-6xl font-extrabold leading-none">{code?.code ?? "—"}</span>
              </div>
            </div>

            {code ? (
              <>
                <div className="border-y border-border bg-background px-6 py-8">
                  {official && (
                    <div className="mb-6 rounded-md border border-border bg-card p-4">
                      <p className="mb-2 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">Imagem oficial da portaria</p>
                      <img src={official.img} alt={`Composição ${code.code} na portaria`} className="mx-auto max-h-32 w-auto" />
                    </div>
                  )}
                  <TruckDrawing code={code} />
                </div>
                <dl className="grid grid-cols-2 divide-border md:grid-cols-4 md:divide-x">
                  <Stat label="Eixos" value={String(totalAxles(code))} />
                  <Stat label="Peso por eixo/conjunto" value={`${code.formula} t`} />
                  <Stat label="PBTC máximo" value={`${fmt(code.pbtc)} t`} />
                  <Stat label="Comprimento máx." value={`${fmt(code.comprimento)} m`} />
                </dl>
                {(mapping?.approx || code.aet) && (
                  <div className="flex gap-3 border-t border-border bg-accent px-6 py-4 text-sm">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
                    <div>
                      {mapping?.approx && <p>Sem correspondência exata na portaria — código mais próximo sugerido.</p>}
                      {code.aet && <p>Composição que necessita de AET (Autorização Especial de Trânsito).</p>}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="border-t border-border p-6 text-muted-foreground">Sem classificação SENATRAN para este item.</p>
            )}

            <div className="grid gap-4 border-t-2 border-secondary bg-muted p-6 md:grid-cols-3">
              <Info label="Implemento" value={(imp && implementsMap[imp]) || "—"} />
              <Info label="Código SAP" value={sap?.[2] ?? "—"} big />
              <Info label="Descrição SAP" value={sap?.[3] ?? "—"} />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5">
      <dt className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display text-2xl font-bold">{value}</dd>
    </div>
  );
}

function Info({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div>
      <p className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={big ? "font-display text-3xl font-extrabold" : "mt-1 text-lg font-semibold"}>{value}</p>
    </div>
  );
}
