import geoRaw from "@/data/bess-karte-3d/bundeslaender.geo.json";
import karteRaw from "@/data/bess-karte-3d/karte3d.json";

import { bessNetzbetreiberManifest } from "@/lib/bessNetzbetreiber/loadBessNetzbetreiber.server";
import { computeKarteKernzahlen, type KarteKernzahlen } from "@/lib/bessKarte3d/kernzahlen";
import { DEFAULT_KARTE_FILTER, sitesAtCut } from "@/lib/bessKarte3d/logic";
import type {
  BundeslaenderGeoJson,
  Karte3dData,
  Karte3dSummary,
  StartKartePreviewData,
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

let cachedStartPreview: StartKartePreviewData | null = null;

/** Kompakte Daten für die statische Kartenvorschau auf `/` (gleiche Datenquelle wie `/netzbetreiber`). */
export function loadStartKartePreviewData(): StartKartePreviewData {
  if (cachedStartPreview) return cachedStartPreview;
  const summary = loadKarte3dSummary();
  const geoJson = loadBundeslaenderGeoJson();
  const data = karteRaw as unknown as Karte3dData;
  const manifest = bessNetzbetreiberManifest();
  const latestMonat = data.monatKumuliert[data.monatKumuliert.length - 1]?.monat ?? "2026-11";
  const cut = sitesAtCut(data.einheiten, latestMonat, DEFAULT_KARTE_FILTER);
  const maxScaleValue = Math.max(...summary.meta.hoehenReferenzMw, 140);
  const stichtag = String(
    summary.meta.stichtag ??
      (typeof manifest.stichtagMastr === "string" ? manifest.stichtagMastr : ""),
  );

  cachedStartPreview = {
    nettoMw: summary.totals.nettoMw,
    n: summary.totals.n,
    lokationen: summary.totals.lokationen,
    stichtag,
    maxScaleValue,
    geoJson,
    sites: cut.sites.map((s) => ({
      lok: s.lok,
      lat: s.lat,
      lng: s.lng,
      nettoMw: s.nettoMw,
      units: s.einheiten.map((e) => ({
        ibnMonat: String(e.ibn).slice(0, 7),
        nettoMw: e.nettoMw,
      })),
    })),
    monate: data.monatKumuliert.map((m) => m.monat),
  };
  return cachedStartPreview;
}
