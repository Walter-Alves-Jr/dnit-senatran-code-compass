import raw from "@/data/portaria.json";

const files = import.meta.glob("/src/assets/senatran/*.png", { eager: true, query: "?url", import: "default" }) as Record<string, string>;

export type PortariaItem = { code: string; familyKey: string; family: string; formula: string; pbtc: string; img: string };

export const PORTARIA: PortariaItem[] = raw.map((i) => ({ ...i, img: files[`/src/assets/senatran/${i.img}`] ?? "" }));
