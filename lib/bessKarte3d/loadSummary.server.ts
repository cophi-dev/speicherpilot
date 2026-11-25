import geoRaw from "@/data/bess-karte-3d/bundeslaender.geo.json";
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

/** Vereinfachte Ländergrenzen als statischer JSON-Import (data/bess-karte-3d/bundeslaender.geo.json), damit sie auf Vercel im Bundle landen. */
export function loadBundeslaenderGeoJson(): BundeslaenderGeoJson {
  if (cachedGeoJson) {
    return cachedGeoJson;
  }
  cachedGeoJson = geoRaw as unknown as BundeslaenderGeoJson;
  return cachedGeoJson;
}
