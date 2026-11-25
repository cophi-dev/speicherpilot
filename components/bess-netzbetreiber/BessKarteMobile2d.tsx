"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  ORIENTIERUNGS_STAEDTE,
  punktRadius2d,
  MOBIL_PUNKT_MIN_R,
  MOBIL_PUNKT_MAX_R,
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

/** Maximaler Zoom der Mobilkarte (≈ Landkreis-/Lokationsebene). */
const MOBIL_ZOOM_MAX = 12;

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
  // Zoom über die viewBox: k = Faktor, (vx, vy) = linke obere Ecke im Kartenraum.
  const [view, setView] = useState({ k: 1, vx: 0, vy: 0 });
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<{ dist: number; midX: number; midY: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const [wheelActive, setWheelActive] = useState(false);
  const wheelActiveRef = useRef(false);
  useEffect(() => {
    wheelActiveRef.current = wheelActive;
  }, [wheelActive]);
  const [wheelHint, setWheelHint] = useState(false);

  function applyView(v: { k: number; vx: number; vy: number }) {
    viewRef.current = v;
    setView(v);
  }

  function clampView(k: number, vx: number, vy: number) {
    const kk = Math.max(1, Math.min(MOBIL_ZOOM_MAX, k));
    const w = VIEW_W / kk;
    const h = VIEW_H / kk;
    return {
      k: kk,
      vx: Math.max(0, Math.min(VIEW_W - w, vx)),
      vy: Math.max(0, Math.min(VIEW_H - h, vy)),
    };
  }

  /** Bildschirmpunkt → Kartenraum (viewBox-Koordinaten) für die aktuelle Ansicht. */
  function toMap(clientX: number, clientY: number, v = viewRef.current) {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: v.vx + ((clientX - rect.left) / rect.width) * (VIEW_W / v.k),
      y: v.vy + ((clientY - rect.top) / rect.height) * (VIEW_H / v.k),
      rect,
    };
  }

  function zoomAt(factor: number, clientX?: number, clientY?: number) {
    const v = viewRef.current;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const cxp = clientX ?? rect.left + rect.width / 2;
    const cyp = clientY ?? rect.top + rect.height / 2;
    const m = toMap(cxp, cyp, v);
    if (!m) return;
    const k = Math.max(1, Math.min(MOBIL_ZOOM_MAX, v.k * factor));
    const fx = (cxp - rect.left) / rect.width;
    const fy = (cyp - rect.top) / rect.height;
    applyView(clampView(k, m.x - fx * (VIEW_W / k), m.y - fy * (VIEW_H / k)));
  }

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let timer: number | null = null;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey || wheelActiveRef.current)) {
        setWheelHint(true);
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(() => setWheelHint(false), 1600);
        return;
      }
      e.preventDefault();
      zoomAt(Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * 0.006), e.clientX, e.clientY);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      svg.removeEventListener("wheel", onWheel);
      if (timer) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function gesture() {
    const pts = [...pointersRef.current.values()];
    if (pts.length === 0) return null;
    if (pts.length === 1) return { dist: 0, midX: pts[0]!.x, midY: pts[0]!.y };
    const [p, q] = [pts[0]!, pts[1]!];
    return { dist: Math.hypot(p.x - q.x, p.y - q.y), midX: (p.x + q.x) / 2, midY: (p.y + q.y) / 2 };
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    setWheelActive(true);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture();
    // Ein Finger verschiebt nur, wenn hineingezoomt ist; sonst bleibt Seiten-Scrollen frei.
    if (pointersRef.current.size >= 2 || viewRef.current.k > 1) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    gestureRef.current = g ? { ...g, moved: false } : null;
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const prev = gestureRef.current;
    const now = gesture();
    if (!prev || !now) return;
    const two = pointersRef.current.size >= 2;
    if (!two && viewRef.current.k <= 1) return;
    const dx = now.midX - prev.midX;
    const dy = now.midY - prev.midY;
    if (!prev.moved && Math.hypot(dx, dy) < 4 && !two) return;
    const v = viewRef.current;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    let k = v.k;
    if (two && prev.dist > 0 && now.dist > 0) k = Math.max(1, Math.min(MOBIL_ZOOM_MAX, v.k * (now.dist / prev.dist)));
    // Kartenpunkt unter dem alten Mittelpunkt landet unter dem neuen Mittelpunkt.
    const m = toMap(prev.midX, prev.midY, v);
    if (!m) return;
    const fx = (now.midX - rect.left) / rect.width;
    const fy = (now.midY - rect.top) / rect.height;
    applyView(clampView(k, m.x - fx * (VIEW_W / k), m.y - fy * (VIEW_H / k)));
    gestureRef.current = { ...now, moved: true };
    suppressClickRef.current = true;
  }

  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    pointersRef.current.delete(e.pointerId);
    const g = gesture();
    gestureRef.current = g ? { ...g, moved: true } : null;
  }

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
          r: punktRadius2d(val, maxScaleValue, MOBIL_PUNKT_MIN_R, MOBIL_PUNKT_MAX_R),
        };
      })
      .sort((a, b) => b.r - a.r);
  }, [sites, modus, maxScaleValue]);

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    const m = toMap(e.clientX, e.clientY);
    if (!m) return;
    const sx = m.x;
    const sy = m.y;
    const k = view.k;

    let best: KarteSite | null = null;
    let bestScore = Infinity;
    for (const d of dots) {
      const r = d.r / Math.pow(k, 0.6);
      const dist = Math.hypot(sx - d.x, sy - d.y);
      const hitLimit = Math.max(r + 8 / k, 22 / k);
      if (dist <= hitLimit) {
        // Bevorzuge direkte Treffer im Kreis und kleinere/nähere Punkte
        const score = Math.max(0, dist - r * 0.65);
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
    <div className={styles.mobile2dWrap} onMouseLeave={() => setWheelActive(false)}>
      <p className={`${styles.mobileTapHint} num`}>
        Punkt antippen für Lokationsdetails (Kreisfläche ∝ {modus === "mwh" ? "MWh" : "Netto-MW"}) · zwei Finger:
        zoomen
      </p>
      <div className={styles.mobileMapFrame}>
      <svg
        ref={svgRef}
        viewBox={`${view.vx} ${view.vy} ${VIEW_W / view.k} ${VIEW_H / view.k}`}
        className={styles.mobile2dSvg}
        style={{ touchAction: view.k > 1 ? "none" : "pan-y" }}
        role="img"
        aria-label="2D-Karte der Batteriespeicher ab 1 MW in Deutschland. Punkt antippen für Details, mit zwei Fingern zoomen."
        onClick={handleSvgClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
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
                vectorEffect="non-scaling-stroke"
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
                r={d.r / Math.pow(view.k, 0.6)}
                vectorEffect="non-scaling-stroke"
                className={selected ? styles.mobileDotSelected : styles.mobileDot}
              />
            );
          })}
        </g>

        <g pointerEvents="none">
          {cities.map((c) => (
            <g key={c.name} transform={`translate(${c.x}, ${c.y}) scale(${1 / view.k})`}>
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
      <div className={styles.zoomBtns} role="group" aria-label="Zoom">
        <button
          type="button"
          className={styles.camBtn}
          onClick={() => zoomAt(1.6)}
          disabled={view.k >= MOBIL_ZOOM_MAX - 1e-6}
          aria-label="Hineinzoomen"
        >
          +
        </button>
        <button
          type="button"
          className={styles.camBtn}
          onClick={() => zoomAt(1 / 1.6)}
          disabled={view.k <= 1 + 1e-6}
          aria-label="Herauszoomen"
        >
          −
        </button>
        <button
          type="button"
          className={styles.camBtn}
          onClick={() => applyView({ k: 1, vx: 0, vy: 0 })}
          aria-label="Ansicht zurücksetzen"
        >
          ⌂
        </button>
      </div>
      {wheelHint ? (
        <div className={`${styles.wheelHint} num`} role="status" aria-live="polite">
          Zum Zoomen Strg/⌘ + Mausrad oder erst auf die Karte klicken
        </div>
      ) : null}
      </div>
    </div>
  );
}
