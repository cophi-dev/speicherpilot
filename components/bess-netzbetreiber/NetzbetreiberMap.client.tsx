"use client";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, ZoomControl, useMap } from "react-leaflet";

import type { BessSite } from "@/lib/bessNetzbetreiber/schema";
import type { KnotenPalette } from "@/components/knoten/knotenPalette";

const GERMANY_BOUNDS = L.latLngBounds([47.25, 5.8], [55.15, 15.05]);

const WORLD_RING: [number, number][] = [
  [85, -30],
  [85, 45],
  [-60, 45],
  [-60, -30],
  [85, -30],
];

const GERMANY_MASK_HOLE: [number, number][] = [
  [55.2, 5.7],
  [55.2, 15.2],
  [47.2, 15.2],
  [47.2, 5.7],
  [55.2, 5.7],
];

function MapFitGermany() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(GERMANY_BOUNDS, { padding: [12, 12], maxZoom: 7 });
    const t = window.setTimeout(() => map.invalidateSize(true), 200);
    return () => window.clearTimeout(t);
  }, [map]);
  return null;
}

function neighborMaskStyle(): L.PathOptions {
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--background").trim();
  const fill = bg.startsWith("hsl") ? bg : `hsl(${bg})`;
  return {
    fillColor: fill || "#f4f5f6",
    fillOpacity: 0.65,
    stroke: false,
    interactive: false,
  };
}

function MapNeighborMask() {
  const map = useMap();
  useEffect(() => {
    const layer = L.polygon([WORLD_RING, GERMANY_MASK_HOLE], neighborMaskStyle()).addTo(map);
    layer.bringToFront();
    return () => {
      map.removeLayer(layer);
    };
  }, [map]);
  return null;
}

function colorFor(op: BessSite["operatorClass"], palette: KnotenPalette): string {
  if (op === "eon") return palette.teal;
  if (op === "uenb") return palette.gray;
  return palette.rust;
}

function clusterSites(sites: BessSite[], cellDeg = 0.15): BessSite[] {
  const buckets = new Map<string, BessSite>();
  for (const site of sites) {
    const latKey = Math.round(site.lat / cellDeg);
    const lngKey = Math.round(site.lng / cellDeg);
    const key = `${latKey}|${lngKey}`;
    const prev = buckets.get(key);
    if (!prev) {
      buckets.set(key, { ...site });
      continue;
    }
    buckets.set(key, {
      ...prev,
      bruttoMw: prev.bruttoMw + site.bruttoMw,
      nettoMw: prev.nettoMw + site.nettoMw,
      energyMwh: prev.energyMwh + site.energyMwh,
      units: prev.units + site.units,
      operatorClass: site.bruttoMw > prev.bruttoMw ? site.operatorClass : prev.operatorClass,
      vnbBucketLabel: site.bruttoMw > prev.bruttoMw ? site.vnbBucketLabel : prev.vnbBucketLabel,
      vnbBucketKey: site.bruttoMw > prev.bruttoMw ? site.vnbBucketKey : prev.vnbBucketKey,
    });
  }
  return [...buckets.values()];
}

function radiusForMw(bruttoMw: number, units: number): number {
  const base = Math.sqrt(Math.max(bruttoMw, 0.4) / Math.PI);
  const dense = units > 1 ? 0.72 : 1;
  return Math.min(22, Math.max(4, base * 5.5 * dense));
}

export default function NetzbetreiberMap({
  sites,
  palette,
  focusKey,
}: {
  sites: BessSite[];
  palette: KnotenPalette;
  focusKey?: string | null;
}) {
  const rendered = useMemo(() => clusterSites(sites), [sites]);
  const filtered = focusKey
    ? rendered.filter(
        (s) =>
          s.vnbBucketKey === focusKey ||
          s.vnbBucketLabel.toLowerCase().includes(focusKey.toLowerCase()) ||
          s.vnbDominant.toLowerCase().includes(focusKey.toLowerCase()),
      )
    : rendered;

  return (
    <MapContainer
      bounds={GERMANY_BOUNDS}
      scrollWheelZoom
      className="netzbetreiber-leaflet"
      style={{ height: "100%", width: "100%", background: "var(--background)" }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="topright" />
      <MapFitGermany />
      <MapNeighborMask />
      {filtered.map((site) => {
        const radius = radiusForMw(site.bruttoMw, site.units);
        const strokeDash =
          site.coordinateQuality === "gemeinde_naeherung" || site.coordinateQuality === "plz_mittelpunkt"
            ? "4 3"
            : undefined;
        const fill = colorFor(site.operatorClass, palette);
        const dimmed = focusKey && site.vnbBucketKey !== focusKey;
        return (
          <CircleMarker
            key={`${site.lat}|${site.lng}|${site.vnbBucketKey}`}
            center={L.latLng(site.lat, site.lng)}
            radius={radius}
            pathOptions={{
              color: fill,
              fillColor: fill,
              fillOpacity: dimmed ? 0.2 : 0.55,
              weight: site.coordinateQuality === "exakt" ? 1 : 2,
              dashArray: strokeDash,
            }}
          >
            <Tooltip direction="top" opacity={0.95}>
              <strong>{site.vnbBucketLabel}</strong>
              <br />
              Brutto {site.bruttoMw.toFixed(1)} MW · Netto {site.nettoMw.toFixed(1)} MW
              {site.units > 1 ? (
                <>
                  <br />
                  {site.units} Einheiten am Punkt
                </>
              ) : null}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}