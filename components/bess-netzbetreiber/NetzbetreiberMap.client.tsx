"use client";

import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
} from "react-leaflet";

import type { BessSite } from "@/lib/bessNetzbetreiber/schema";
import type { KnotenPalette } from "@/components/knoten/knotenPalette";
import styles from "@/components/bess-netzbetreiber/bess-netzbetreiber.module.css";

/** Enger DE-Ausschnitt (kein halbes Europa). */
const GERMANY_BOUNDS = L.latLngBounds([47.27, 5.86], [55.06, 15.04]);
const MAX_BOUNDS = L.latLngBounds([46.4, 4.3], [55.9, 16.2]);

const OUTSIDE_PANELS: [number, number][][] = [
  [[85, -30], [85, 45], [55.15, 45], [55.15, -30]],
  [[-60, -30], [-60, 45], [47.1, 45], [47.1, -30]],
  [[47.1, -30], [55.15, -30], [55.15, 5.75], [47.1, 5.75]],
  [[47.1, 15.05], [55.15, 15.05], [55.15, 45], [47.1, 45]],
];

type ClusterOrPoint =
  | { kind: "point"; site: BessSite }
  | { kind: "cluster"; lat: number; lng: number; units: number; bruttoMw: number; sites: BessSite[] };

function cellDegForZoom(zoom: number): number | null {
  if (zoom >= 9) return null;
  if (zoom >= 7) return 0.12;
  if (zoom >= 6) return 0.22;
  return 0.42;
}

function clusterSitesForZoom(sites: BessSite[], zoom: number): ClusterOrPoint[] {
  const cell = cellDegForZoom(zoom);
  if (cell === null) {
    return sites.map((site) => ({ kind: "point", site }));
  }
  const buckets = new Map<string, BessSite[]>();
  for (const site of sites) {
    const latKey = Math.round(site.lat / cell);
    const lngKey = Math.round(site.lng / cell);
    const key = `${latKey}|${lngKey}`;
    const list = buckets.get(key) ?? [];
    list.push(site);
    buckets.set(key, list);
  }
  const out: ClusterOrPoint[] = [];
  for (const group of buckets.values()) {
    if (group.length === 1) {
      out.push({ kind: "point", site: group[0]! });
      continue;
    }
    const lat = group.reduce((s, g) => s + g.lat, 0) / group.length;
    const lng = group.reduce((s, g) => s + g.lng, 0) / group.length;
    const bruttoMw = group.reduce((s, g) => s + g.bruttoMw, 0);
    const units = group.reduce((s, g) => s + g.units, 0);
    out.push({ kind: "cluster", lat, lng, units, bruttoMw, sites: group });
  }
  return out;
}

function MapSetup() {
  const map = useMap();
  useEffect(() => {
    map.setMinZoom(5);
    map.setMaxBounds(MAX_BOUNDS);
    map.options.maxBoundsViscosity = 1;
    map.fitBounds(GERMANY_BOUNDS, { padding: [10, 10], maxZoom: 6 });
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
    fillOpacity: 0.85,
    stroke: false,
    interactive: false,
  };
}

function MapNeighborMask() {
  const map = useMap();
  const [, bump] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => bump((n) => n + 1));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!map.getPane("maskPane")) {
      const pane = map.createPane("maskPane");
      pane.style.zIndex = "340";
    }
    const layer = L.polygon(OUTSIDE_PANELS, { ...neighborMaskStyle(), pane: "maskPane" }).addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, bump]);

  return null;
}

function colorFor(op: BessSite["operatorClass"], palette: KnotenPalette): string {
  if (op === "eon") return palette.teal;
  if (op === "uenb") return palette.gray;
  return palette.rust;
}

function formatClusterPower(bruttoMw: number): string {
  if (bruttoMw >= 1000) return `${(bruttoMw / 1000).toFixed(2)} GW`;
  return `${bruttoMw.toFixed(0)} MW`;
}

function clusterIcon(units: number, bruttoMw: number, fill: string) {
  return L.divIcon({
    className: styles.clusterIcon,
    html: `<div class="${styles.clusterBubble}" style="border-color:${fill};color:${fill}"><span class="${styles.clusterCount}">${units}</span><span class="${styles.clusterGw}">${formatClusterPower(bruttoMw)}</span></div>`,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
  });
}

function radiusForMw(bruttoMw: number): number {
  const area = Math.max(bruttoMw, 0.35);
  return Math.min(20, Math.max(5, Math.sqrt(area / Math.PI) * 5.2));
}

function MapMarkers({
  sites,
  palette,
  focusKey,
}: {
  sites: BessSite[];
  palette: KnotenPalette;
  focusKey?: string | null;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useEffect(() => {
    const sync = () => setZoom(map.getZoom());
    sync();
    map.on("zoomend", sync);
    return () => {
      map.off("zoomend", sync);
    };
  }, [map]);

  const filtered = useMemo(
    () =>
      focusKey
        ? sites.filter(
            (s) =>
              s.vnbBucketKey === focusKey ||
              s.vnbBucketLabel.toLowerCase().includes(focusKey.toLowerCase()) ||
              s.vnbDominant.toLowerCase().includes(focusKey.toLowerCase()),
          )
        : sites,
    [sites, focusKey],
  );

  const items = useMemo(() => clusterSitesForZoom(filtered, zoom), [filtered, zoom]);

  return (
    <>
      {items.map((item) => {
        if (item.kind === "cluster") {
          const fill = colorFor(
            item.sites.sort((a, b) => b.bruttoMw - a.bruttoMw)[0]!.operatorClass,
            palette,
          );
          return (
            <Marker
              key={`c|${item.lat}|${item.lng}`}
              position={[item.lat, item.lng]}
              icon={clusterIcon(item.units, item.bruttoMw, fill)}
              zIndexOffset={400}
            >
              <Tooltip direction="top" opacity={0.95}>
                <strong>{item.units} Einheiten</strong>
                <br />
                Brutto {formatClusterPower(item.bruttoMw)}
              </Tooltip>
            </Marker>
          );
        }
        const site = item.site;
        const radius = radiusForMw(site.bruttoMw);
        const strokeDash =
          site.coordinateQuality === "gemeinde_naeherung" || site.coordinateQuality === "plz_mittelpunkt"
            ? "4 3"
            : undefined;
        const fill = colorFor(site.operatorClass, palette);
        const dimmed = Boolean(focusKey && site.vnbBucketKey !== focusKey);
        return (
          <CircleMarker
            key={`p|${site.lat}|${site.lng}|${site.vnbBucketKey}`}
            center={L.latLng(site.lat, site.lng)}
            radius={radius}
            pathOptions={{
              color: fill,
              fillColor: fill,
              fillOpacity: dimmed ? 0.25 : 0.55,
              weight: 1,
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
    </>
  );
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
  return (
    <MapContainer
      bounds={GERMANY_BOUNDS}
      minZoom={5}
      maxBounds={MAX_BOUNDS}
      scrollWheelZoom
      className="netzbetreiber-leaflet"
      style={{ height: "100%", width: "100%", background: "hsl(var(--background))" }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="topright" />
      <MapSetup />
      <MapNeighborMask />
      <MapMarkers sites={sites} palette={palette} focusKey={focusKey} />
    </MapContainer>
  );
}