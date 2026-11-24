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

/** Sichtfenster = Deutschland (kein Europa-Panorama). */
const GERMANY_SW: L.LatLngTuple = [47.35, 5.95];
const GERMANY_NE: L.LatLngTuple = [55.02, 14.92];
const GERMANY_BOUNDS = L.latLngBounds(GERMANY_SW, GERMANY_NE);
const MAX_BOUNDS = GERMANY_BOUNDS;

function buildOutsidePanels(b: L.LatLngBounds): L.LatLngExpression[][] {
  const sw = b.getSouthWest();
  const ne = b.getNorthEast();
  const lngPad = 24;
  const latPad = 12;
  const w = (lat: number, lng: number): L.LatLngExpression => [lat, lng];
  return [
    [w(ne.lat, sw.lng - lngPad), w(ne.lat + latPad, sw.lng - lngPad), w(ne.lat + latPad, ne.lng + lngPad), w(ne.lat, ne.lng + lngPad)],
    [w(sw.lat - latPad, sw.lng - lngPad), w(sw.lat, sw.lng - lngPad), w(sw.lat, ne.lng + lngPad), w(sw.lat - latPad, ne.lng + lngPad)],
    [w(sw.lat - latPad, sw.lng - lngPad), w(ne.lat + latPad, sw.lng - lngPad), w(ne.lat + latPad, sw.lng), w(sw.lat - latPad, sw.lng)],
    [w(sw.lat - latPad, ne.lng), w(ne.lat + latPad, ne.lng), w(ne.lat + latPad, ne.lng + lngPad), w(sw.lat - latPad, ne.lng + lngPad)],
  ];
}

type ClusterOrPoint =
  | { kind: "point"; site: BessSite }
  | { kind: "cluster"; lat: number; lng: number; units: number; bruttoMw: number; sites: BessSite[] };

function cellDegForZoom(zoom: number): number | null {
  if (zoom >= 10) return null;
  if (zoom >= 8) return 0.1;
  if (zoom >= 7) return 0.2;
  if (zoom >= 6) return 0.35;
  return 0.6;
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

function fitGermany(map: L.Map, padding: L.PointExpression = [4, 4]) {
  map.fitBounds(GERMANY_BOUNDS, { padding, animate: false, maxZoom: 8 });
  const minZoom = map.getBoundsZoom(GERMANY_BOUNDS, false, padding);
  if (Number.isFinite(minZoom)) {
    map.setMinZoom(minZoom);
    if (map.getZoom() < minZoom) map.setZoom(minZoom);
  }
}

function MapSetup() {
  const map = useMap();
  useEffect(() => {
    map.setMaxBounds(MAX_BOUNDS);
    map.options.maxBoundsViscosity = 1;
    map.options.worldCopyJump = false;

    const apply = () => {
      fitGermany(map, [4, 4]);
      map.invalidateSize(true);
    };

    apply();
    const t = window.setTimeout(apply, 150);

    const container = map.getContainer();
    const ro = new ResizeObserver(() => {
      fitGermany(map, [4, 4]);
    });
    ro.observe(container);

    return () => {
      window.clearTimeout(t);
      ro.disconnect();
    };
  }, [map]);
  return null;
}

function neighborMaskStyle(): L.PathOptions {
  const isDark = document.documentElement.classList.contains("dark");
  return {
    fillColor: "hsl(var(--background))",
    fillOpacity: isDark ? 0.96 : 0.92,
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
    const panels = buildOutsidePanels(GERMANY_BOUNDS);
    const layer = L.polygon(panels, { ...neighborMaskStyle(), pane: "maskPane" }).addTo(map);
    const sync = () => {
      layer.setStyle(neighborMaskStyle());
    };
    map.on("zoomend", sync);
    return () => {
      map.off("zoomend", sync);
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
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

function radiusForMw(bruttoMw: number): number {
  const area = Math.max(bruttoMw, 0.35);
  return Math.min(18, Math.max(4, Math.sqrt(area / Math.PI) * 4.8));
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

  const inGermany = useMemo(
    () => sites.filter((s) => GERMANY_BOUNDS.contains(L.latLng(s.lat, s.lng))),
    [sites],
  );

  const filtered = useMemo(
    () =>
      focusKey
        ? inGermany.filter(
            (s) =>
              s.vnbBucketKey === focusKey ||
              s.vnbBucketLabel.toLowerCase().includes(focusKey.toLowerCase()) ||
              s.vnbDominant.toLowerCase().includes(focusKey.toLowerCase()),
          )
        : inGermany,
    [inGermany, focusKey],
  );

  const items = useMemo(() => clusterSitesForZoom(filtered, zoom), [filtered, zoom]);

  return (
    <>
      {items.map((item) => {
        if (item.kind === "cluster") {
          if (!GERMANY_BOUNDS.contains(L.latLng(item.lat, item.lng))) return null;
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
  const center = useMemo(() => GERMANY_BOUNDS.getCenter(), []);

  return (
    <MapContainer
      center={center}
      zoom={6}
      maxBounds={MAX_BOUNDS}
      maxBoundsViscosity={1}
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