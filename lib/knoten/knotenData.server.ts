import fs from "node:fs";
import path from "node:path";

import {
  KNOTEN_BELEGUNGEN,
  KNOTEN_FAKTOREN,
  KNOTEN_TYPEN,
  type KnotenBelegung,
  type KnotenCurvePayload,
  type KnotenDayRow,
  type KnotenFaktor,
  type KnotenManifest,
  type KnotenSearch,
  type KnotenTyp,
  knotenSearchSchema,
} from "@/lib/knoten/knotenTypes";
import { knotenNearestDay, knotenSaisonForDay } from "@/lib/knoten/knotenSaison";

const DATA_ROOT = path.join(process.cwd(), "data", "knoten");

let manifestCache: KnotenManifest | null = null;
const daysCache = new Map<KnotenBelegung, KnotenDayRow[]>();

export function loadKnotenManifest(): KnotenManifest {
  if (manifestCache) {
    return manifestCache;
  }
  const raw = fs.readFileSync(path.join(DATA_ROOT, "manifest.json"), "utf8");
  manifestCache = JSON.parse(raw) as KnotenManifest;
  return manifestCache;
}

function loadDays(belegung: KnotenBelegung): KnotenDayRow[] {
  const hit = daysCache.get(belegung);
  if (hit) {
    return hit;
  }
  const raw = fs.readFileSync(path.join(DATA_ROOT, belegung, "days.json"), "utf8");
  const rows = JSON.parse(raw) as KnotenDayRow[];
  daysCache.set(belegung, rows);
  return rows;
}

export function resolveKnotenView(search: KnotenSearch): {
  belegung: KnotenBelegung;
  typ: KnotenTyp;
  k: KnotenFaktor;
  tag: string;
  saison: "herbst" | "sommer";
  row: KnotenDayRow;
  manifest: KnotenManifest;
} {
  const manifest = loadKnotenManifest();
  const belegung = search.belegung ?? manifest.defaultBelegung;
  const typ = search.typ ?? manifest.defaultNode;
  const k = (search.k ?? manifest.defaultFactor) as KnotenFaktor;
  const tagRaw = search.tag ?? manifest.defaultDay;
  const tag = knotenNearestDay(tagRaw, manifest);
  const saison = knotenSaisonForDay(tag);
  if (!saison) {
    throw new Error(`Tag ${tag} liegt außerhalb der Knoten-Fenster`);
  }
  const days = loadDays(belegung);
  const row = days.find((d) => d.day === tag && d.node === typ && d.k === k && d.saison === saison);
  if (!row) {
    throw new Error(`Keine Knoten-Zeile für ${tag} ${typ} ×${k} (${belegung})`);
  }
  return { belegung, typ, k, tag, saison, row, manifest };
}

export function parseKnotenSearch(raw: Record<string, string | string[] | undefined>): KnotenSearch {
  const flat: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (val === undefined) {
      continue;
    }
    flat[key] = Array.isArray(val) ? val[0]! : val;
  }
  const parsed = knotenSearchSchema.safeParse(flat);
  return parsed.success ? parsed.data : {};
}

export function loadKnotenCurve(
  belegung: KnotenBelegung,
  saison: "herbst" | "sommer",
  typ: KnotenTyp,
  k: KnotenFaktor,
  day: string,
): KnotenCurvePayload {
  const file = path.join(DATA_ROOT, belegung, "curves", saison, typ, String(k), `${day}.json`);
  const raw = fs.readFileSync(file, "utf8");
  return JSON.parse(raw) as KnotenCurvePayload;
}

export function listKnotenDaysForNode(
  belegung: KnotenBelegung,
  typ: KnotenTyp,
  k: KnotenFaktor,
  saison: "herbst" | "sommer",
): string[] {
  const days = loadDays(belegung).filter((d) => d.node === typ && d.k === k && d.saison === saison);
  return days.map((d) => d.day).sort();
}

export function knotenStaticParamGuard() {
  return { belegungen: KNOTEN_BELEGUNGEN, typen: KNOTEN_TYPEN, faktoren: KNOTEN_FAKTOREN };
}