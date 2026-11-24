"use client";

import L from "leaflet";
import { MapContainer, TileLayer, CircleMarker, Tooltip, ZoomControl } from "react-leaflet";

import type { BessSite } from "@/lib/bessNetzbetreiber/schema";
import { mapPointRadiusMw } from "@/lib/bessNetzbetreiber/prepareModel";

const CENTER: [number, number] = [51.1, 10.4];
const ZOOM = 6;

function colorFor(op: BessSite["operatorClass"]): string {
  if (op === "eon") return "#0b6870";
  if (op === "uenb") return "#4f5961";
  return "#c4a574";
}

export default function NetzbetreiberMap({ sites }: { sites: BessSite[] }) {
  return (
    <MapContainer
      center={CENTER}
      zoom={ZOOM}
      scrollWheelZoom
      style={{ height: "100%", width: "100%", background: "#e8e6e1" }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="topright" />
      {sites.map((site) => {
        const radius = Math.min(28, Math.max(4, mapPointRadiusMw(site.bruttoMw)));
        const strokeDash =
          site.coordinateQuality === "gemeinde_naeherung" || site.coordinateQuality === "plz_mittelpunkt"
            ? "4 3"
            : undefined;
        return (
          <CircleMarker
            key={`${site.lat}|${site.lng}|${site.vnbBucketKey}`}
            center={L.latLng(site.lat, site.lng)}
            radius={radius}
            pathOptions={{
              color: colorFor(site.operatorClass),
              fillColor: colorFor(site.operatorClass),
              fillOpacity: 0.55,
              weight: site.coordinateQuality === "exakt" ? 1 : 2,
              dashArray: strokeDash,
            }}
          >
            <Tooltip direction="top" opacity={0.95}>
              <strong>{site.vnbBucketLabel}</strong>
              <br />
              Brutto {site.bruttoMw.toFixed(1)} MW · Netto {site.nettoMw.toFixed(1)} MW
              {site.coordinateQuality !== "exakt" ? (
                <>
                  <br />
                  Koordinate: {site.coordinateQuality.replaceAll("_", " ")}
                </>
              ) : null}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}