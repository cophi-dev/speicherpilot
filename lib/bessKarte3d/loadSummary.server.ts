import { readFileSync } from "node:fs";
import path from "node:path";

import karteRaw from "@/data/bess-karte-3d/karte3d.json";

import type {
  BundeslaenderGeoJson,
  Karte3dData,
  Karte3dSummary,
} from "@/lib/bessKarte3d/types";

let cachedSummary: Karte3dSummary | null = null;
let cachedGeoJson: BundeslaenderGeoJson | null = null;

/**
 * Liefert nur die kompakten Metadaten, 16 Bundesländer und 5 koordinatenlosen Einheiten
 * für SSR. Das vollständige 575-Einheiten-JSON lädt die 3D-Karte dynamisch im Client-Bundle.
 */
export function loadKarte3dSummary(): Karte3dSummary {
  if (cachedSummary) {
    return cachedSummary;
  }
  const data = karteRaw as unknown as Karte3dData;
  cachedSummary = {
    meta: data.meta,
    totals: data.totals,
    bundeslaender: data.bundeslaender,
    ohneKoordinate: data.ohneKoordinate,
  };
  return cachedSummary;
}

/** Lädt die vereinfachten Ländergrenzen serverseitig aus data/bess-karte-3d/bundeslaender.geojson. */
export function loadBundeslaenderGeoJson(): BundeslaenderGeoJson {
  if (cachedGeoJson) {
    return cachedGeoJson;
  }
  const filePath = path.join(
    process.cwd(),
    "data",
    "bess-karte-3d",
    "bundeslaender.geojson",
  );
  const raw = readFileSync(filePath, "utf8");
  cachedGeoJson = JSON.parse(raw) as BundeslaenderGeoJson;
  return cachedGeoJson;
}
