"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  ORIENTIERUNGS_STAEDTE,
  punktRadius2d,
} from "@/lib/bessKarte3d/logic";
import {
  polygonRingsToSvgPath2d,
  projectGeoTo2d,
} from "@/lib/bessKarte3d/projection3d";
import type {
  BundeslaenderGeoJson,
  BundeslandKarteDatum,
  HoehenModus,
  KarteSite,
} from "@/lib/bessKarte3d/types";
import { abregelungColor } from "@/components/bess-netzbetreiber/BessKarteCanvas3d";
import { abregelungOhneOffshore } from "@/lib/bessKarte3d/logic";
import styles from "@/components/bess-netzbetreiber/bess-netzbetreiber.module.css";

type Props = {
  geoJson: BundeslaenderGeoJson;
  bundeslaender: readonly BundeslandKarteDatum[];
  sites: readonly KarteSite[];
  modus: HoehenModus;
  maxScaleValue: number;
  showAbregelung: boolean;
  selectedLok: string | null;
  onSelectSite: (site: KarteSite | null) => void;
};

const VIEW_W = 420;
const VIEW_H = 510;
const PAD = 22;

export function BessKarteMobile2d({
  geoJson,
  bundeslaender,
  sites,
  modus,
  maxScaleValue,
  showAbregelung,
  selectedLok,
  onSelectSite,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    checkDark();
    const obs = new MutationObserver(checkDark);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  const abregMap = useMemo(() => {
    const m = new Map<string, number | null>();
    let maxGwh = 0;
    for (const b of bundeslaender) {
      // Fläche: EE-Redispatch 2025 ohne Wind Offshore (BMWE-Gesamt minus Offshore-Anteil)
      const gwh = abregelungOhneOffshore(b);
      m.set(b.bundesland, gwh);
      if (gwh !== null && gwh > maxGwh) {
        maxGwh = gwh;
      }
    }
    return { map: m, maxGwh };
  }, [bundeslaender]);

  const statePaths = useMemo(() => {
    return geoJson.features.map((feat) => ({
      name: feat.properties.name,
      d: polygonRingsToSvgPath2d(feat.geometry, VIEW_W, VIEW_H, PAD),
    }));
  }, [geoJson]);

  const cities = useMemo(() => {
    return ORIENTIERUNGS_STAEDTE.map((c) => ({
      name: c.name,
      ...projectGeoTo2d(c.lng, c.lat, VIEW_W, VIEW_H, PAD),
    }));
  }, []);

  // Größte Punkte zuerst zeichnen, damit kleine Punkte oben liegen und antippbar bleiben
  const dots = useMemo(() => {
    return sites
      .map((site) => {
        const val = modus === "mwh" ? site.kapMwh : site.nettoMw;
        const p = projectGeoTo2d(site.lng, site.lat, VIEW_W, VIEW_H, PAD);
        return {
          site,
          x: p.x,
          y: p.y,
          r: punktRadius2d(val, maxScaleValue, 2.8, 18.5),
        };
      })
      .sort((a, b) => b.r - a.r);
  }, [sites, modus, maxScaleValue]);

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const sx = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    const sy = ((e.clientY - rect.top) / rect.height) * VIEW_H;

    let best: KarteSite | null = null;
    let bestScore = Infinity;
    for (const d of dots) {
      const dist = Math.hypot(sx - d.x, sy - d.y);
      const hitLimit = Math.max(d.r + 8, 22);
      if (dist <= hitLimit) {
        // Bevorzuge direkte Treffer im Kreis und kleinere/nähere Punkte
        const score = Math.max(0, dist - d.r * 0.65);
        if (score < bestScore) {
          bestScore = score;
          best = d.site;
        }
      }
    }
    if (best) {
      onSelectSite(best);
    }
  }

  return (
    <div className={styles.mobile2dWrap}>
      <p className={`${styles.mobileTapHint} num`}>
        Punkt antippen für Standortdetails (Kreisfläche ∝ {modus === "mwh" ? "MWh" : "Netto-MW"})
      </p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className={styles.mobile2dSvg}
        role="img"
        aria-label="2D-Karte der Batteriespeicher ab 1 MW in Deutschland. Punkt antippen für Details."
        onClick={handleSvgClick}
      >
        <defs>
          <pattern
            id="bess-abreg-null-hatch"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="6" height="6" fill={isDark ? "#2a2f36" : "#d9d9d2"} />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke={isDark ? "rgba(255,255,255,0.16)" : "rgba(16,18,20,0.16)"}
              strokeWidth="1.5"
            />
          </pattern>
        </defs>

        <g>
          {statePaths.map((st) => {
            const gwh = abregMap.map.get(st.name) ?? null;
            let fill = isDark ? "#171b20" : "#efefe9";
            if (showAbregelung) {
              fill =
                gwh === null
                  ? "url(#bess-abreg-null-hatch)"
                  : abregelungColor(gwh, abregMap.maxGwh, isDark);
            }
            return (
              <path
                key={st.name}
                d={st.d}
                fill={fill}
                stroke={isDark ? "#6b7480" : "#7d7d75"}
                strokeWidth={1.4}
              />
            );
          })}
        </g>

        <g>
          {dots.map((d) => {
            const selected = d.site.lok === selectedLok;
            return (
              <circle
                key={d.site.lok}
                cx={d.x}
                cy={d.y}
                r={d.r}
                className={selected ? styles.mobileDotSelected : styles.mobileDot}
              />
            );
          })}
        </g>

        <g pointerEvents="none">
          {cities.map((c) => (
            <g key={c.name} transform={`translate(${c.x}, ${c.y})`}>
              <circle
                r={2.1}
                fill={isDark ? "rgba(233,238,242,0.7)" : "rgba(16,18,20,0.55)"}
              />
              <text
                x={5}
                y={3}
                className={styles.mobileCityLabel}
              >
                {c.name}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
