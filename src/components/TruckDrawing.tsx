import type { ReactElement } from "react";
import type { SenatranCode, Unit } from "@/lib/senatran";

const WR = 11; // wheel radius
const GAP = 25; // spacing between axles in a group
const GROUP_GAP = 70;
const Y = 110; // ground line - wheel radius

function unitLength(u: Unit) {
  const axles = u.groups.reduce((a, g) => a + g.axles, 0);
  const base = u.type === "trator" ? 150 : u.type === "caminhao" ? 220 : 260;
  return Math.max(base, axles * GAP + (u.groups.length - 1) * GROUP_GAP + 80);
}

function Wheels({ x0, x1, groups: all, allRear }: { x0: number; x1: number; groups: Unit["groups"]; allRear?: boolean }) {
  // first group near front, remaining packed to the rear
  const out: ReactElement[] = [];
  const first = allRear ? undefined : all[0];
  const rest = allRear ? all : all.slice(1);
  const x = x0 + 30;
  const draw = (g: Unit["groups"][number], start: number, key: string) => {
    for (let i = 0; i < g.axles; i++)
      out.push(
        <g key={key + i}>
          <circle cx={start + i * GAP} cy={Y} r={WR} className="fill-foreground" />
          <circle cx={start + i * GAP} cy={Y} r={4} className="fill-background" />
        </g>,
      );
    out.push(
      <text key={key + "t"} x={start + ((g.axles - 1) * GAP) / 2} y={Y + 30} textAnchor="middle" className="fill-muted-foreground text-[11px] font-semibold">
        {String(g.t).replace(".", ",")}t
      </text>,
    );
  };
  if (first) draw(first, x, "f");
  let rx = x1 - 25 - rest.reduce((a, g) => a + (g.axles - 1) * GAP, 0) - (rest.length - 1) * GROUP_GAP;
  rest.forEach((g, i) => {
    draw(g, rx, "r" + i);
    rx += (g.axles - 1) * GAP + GROUP_GAP;
  });
  return <>{out}</>;
}

export function TruckDrawing({ code }: { code: SenatranCode }) {
  let x = 10;
  const parts: ReactElement[] = [];
  code.units.forEach((u, idx) => {
    const len = unitLength(u);
    const x0 = x;
    const x1 = x + len;
    const motor = u.type === "caminhao" || u.type === "trator";
    if (motor) {
      parts.push(
        <g key={idx}>
          <path d={`M${x0} ${Y - 8} L${x0} ${Y - 52} Q${x0} ${Y - 70} ${x0 + 14} ${Y - 72} L${x0 + 52} ${Y - 72} L${x0 + 56} ${Y - 8} Z`} className="fill-primary stroke-foreground" strokeWidth={2} />
          <rect x={x0 + 8} y={Y - 64} width={30} height={20} rx={3} className="fill-background stroke-foreground" strokeWidth={1.5} />
          {u.type === "caminhao" ? (
            <rect x={x0 + 62} y={Y - 80} width={len - 66} height={66} rx={3} className="fill-card stroke-foreground" strokeWidth={2} />
          ) : (
            <rect x={x0 + 56} y={Y - 20} width={len - 56} height={10} className="fill-foreground" />
          )}
          <rect x={x0} y={Y - 14} width={len} height={6} className="fill-foreground" />
          <Wheels x0={x0} x1={x1} groups={u.groups} />
        </g>,
      );
      x = u.type === "trator" ? x1 - 50 : x1 + 18;
    } else {
      const semi = u.type === "semirreboque";
      parts.push(
        <g key={idx}>
          {!semi && <line x1={x0 - 18} y1={Y - 20} x2={x0 + 10} y2={Y - 20} className="stroke-foreground" strokeWidth={3} />}
          <rect x={x0} y={Y - 84} width={len} height={68} rx={3} className="fill-card stroke-foreground" strokeWidth={2} />
          <rect x={x0} y={Y - 18} width={len} height={6} className="fill-foreground" />
          <Wheels x0={x0} x1={x1} groups={u.groups} allRear={semi} />
        </g>,
      );
      x = semi ? x1 - 40 : x1 + 18;
    }
  });
  const width = x + 60;
  return (
    <svg viewBox={`0 0 ${width} 160`} className="h-auto w-full" role="img" aria-label={`Desenho do veículo ${code.code}`}>
      <line x1={0} y1={Y + WR} x2={width} y2={Y + WR} className="stroke-border" strokeWidth={2} strokeDasharray="10 6" />
      {parts}
    </svg>
  );
}
