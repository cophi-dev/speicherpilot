import geoRaw from "@/data/bess-karte-3d/bundeslaender.geo.json";
import karteRaw from "@/data/bess-karte-3d/karte3d.json";

import { computeKarteKernzahlen, type KarteKernzahlen } from "@/lib/bessKarte3d/kernzahlen";
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

/** Vereinfachte Ländergrenzen als statischer JSON-Import (data/bess-karte-3d/bundeslaender.geo.json), damit sie auf Vercel im Bundle landen. */
export function loadBundeslaenderGeoJson(): BundeslaenderGeoJson {
  if (cachedGeoJson) {
    return cachedGeoJson;
  }
  cachedGeoJson = geoRaw as unknown as BundeslaenderGeoJson;
  return cachedGeoJson;
}

let cachedKern: KarteKernzahlen | null = null;

/** Kernzahlen (Konzentration, Zubau) serverseitig aus allen Einheiten, damit nur die Zahlen ins HTML gehen. */
export function loadKarte3dKernzahlen(): KarteKernzahlen {
  if (cachedKern) return cachedKern;
  cachedKern = computeKarteKernzahlen((karteRaw as unknown as Karte3dData).einheiten);
  return cachedKern;
}
