/** Legacy / shorthand hashes → canonical section ids (content unchanged). */
export const METHODIK_HASH_ALIASES: Record<string, string> = {
  beispiele: "beispieltage",
  quartier: "beispieltage",
  ring: "was",
};

export const METHODIK_SECTION_IDS = [
  "annahmen",
  "lizenzen",
  "grenzen",
  "was",
  "einheiten",
  "erzeugung",
  "grossspeicher",
  "wirkungsgrad",
  "live",
  "uebersicht",
  "groesse",
  "ampel",
  "netzdienlichkeit",
  "peak-erklaert",
  "modelltag",
  "beispieltage",
  "szenarien",
  "netz",
  "quellen",
  "glossar",
  "a-modell",
  "b-daten",
  "c-netz",
  "d-recht",
] as const;

export function resolveMethodikHash(raw: string): string {
  const id = raw.replace(/^#/, "");
  return METHODIK_HASH_ALIASES[id] ?? id;
}
