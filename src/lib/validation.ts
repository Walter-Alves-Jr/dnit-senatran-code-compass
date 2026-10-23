import type { Match } from "@/lib/sistema";

export const CATALOG_SOURCE = "Portaria SENATRAN nº 268/2022 — Anexo (classificação de veículos)";
export const CATALOG_VERSION = "268/2022 — anexo original";

export type Status = "pendente" | "sugestao" | "validado" | "confirmado" | "divergencia" | "sem";

export const STATUS: Record<Status, { label: string; help: string; cls: string }> = {
  sugestao: { label: "Sugestão do sistema", help: "Tipo e eixos batem com a portaria, mas ninguém conferiu ainda.", cls: "bg-primary text-primary-foreground" },
  pendente: { label: "Pendente de validação", help: "O código foi ajustado por eixos e peso. Confira com a portaria.", cls: "bg-accent text-accent-foreground" },
  divergencia: { label: "Divergência identificada", help: "Não existe um código igual. É só o mais próximo e precisa ser revisado.", cls: "bg-warning text-secondary-foreground" },
  sem: { label: "Sem correspondência", help: "Nenhum código da portaria se aplica com os dados que temos.", cls: "bg-muted text-muted-foreground" },
  confirmado: { label: "Confirmado manualmente", help: "Uma pessoa conferiu e confirmou o código.", cls: "bg-success text-success-foreground" },
  validado: { label: "Validado contra a fonte oficial", help: "Código conferido com uma lista oficial. Nenhum registro tem isso ainda.", cls: "bg-secondary text-secondary-foreground" },
};

export type Review = {
  status: "confirmado" | "divergencia";
  code: string | null;
  note: string;
  date: string; // ISO
};

/** Status automático. Nunca devolve "validado" nem "confirmado": esses exigem conferência. */
export function autoStatus(m: Match): Status {
  if (m.quality === "exata") return "sugestao";
  if (m.quality === "ajustada") return "pendente";
  if (m.quality === "aproximada") return "divergencia";
  return "sem";
}

export function finalStatus(m: Match, r?: Review): Status {
  return r ? r.status : autoStatus(m);
}

export type ExportFilter = "todos" | "validados" | "pendencias" | "divergencias";
export const FILTERS: Record<ExportFilter, { label: string; has: Status[] }> = {
  todos: { label: "Todos os registros", has: ["sugestao", "pendente", "divergencia", "sem", "confirmado", "validado"] },
  validados: { label: "Apenas validados / confirmados", has: ["validado", "confirmado"] },
  pendencias: { label: "Apenas pendências", has: ["sugestao", "pendente"] },
  divergencias: { label: "Apenas divergências", has: ["divergencia", "sem"] },
};
