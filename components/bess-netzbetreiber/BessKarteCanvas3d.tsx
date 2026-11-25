"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  ORIENTIERUNGS_STAEDTE,
  mastrNameNbsp,
  saeulenHoehe,
} from "@/lib/bessKarte3d/logic";
import {
  type Camera3d,
  clampCamera3d,
  createProjectionParams3d,
  geoToPlane,
  type Point2d,
  projectCuboid,
  projectPoint3d,
} from "@/lib/bessKarte3d/projection3d";
import type {
  BundeslaenderGeoJson,
  BundeslandKarteDatum,
  HoehenModus,
  KarteSite,
} from "@/lib/bessKarte3d/types";
import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import { formatQuantityUnit } from "@/lib/formatQuantity";
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
  camera: Camera3d;
  onCameraChange: (next: Camera3d) => void;
  onResetCamera: () => void;
};

type PreparedPoly = {
  name: string;
  rings: Point2d[][];
};

type HitBox = {
  site: KarteSite;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  topX: number;
  topY: number;
};

// Graustufen, damit die Abregelungs-Fläche nicht mit den warmen Säulen konkurriert.
const ABREGELUNG_STOPS_LIGHT = [
  "#e6e6e0",
  "#cfcfc8",
  "#b3b3ab",
  "#94948c",
  "#76766f",
] as const;

const ABREGELUNG_STOPS_DARK = [
  "#1f2328",
  "#2b3036",
  "#3a4048",
  "#4b525b",
  "#5f6770",
] as const;

export function abregelungColor(
  gwh: number | null,
  maxGwh: number,
  isDark: boolean,
): string {
  if (gwh === null || !Number.isFinite(gwh)) {
    return isDark ? "#2d3238" : "#d4d4ce";
  }
  const stops = isDark ? ABREGELUNG_STOPS_DARK : ABREGELUNG_STOPS_LIGHT;
  const ratio = maxGwh > 0 ? Math.max(0, Math.min(1, gwh / maxGwh)) : 0;
  // Leicht gestauchte Skala (√), damit mittlere Länder differenziert bleiben
  const t = Math.sqrt(ratio);
  const idx = Math.min(stops.length - 1, Math.floor(t * stops.length));
  return stops[idx]!;
}

function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255;
  const ag = (pa >> 8) & 255;
  const ab = pa & 255;
  const br = (pb >> 16) & 255;
  const bg = (pb >> 8) & 255;
  const bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function createNullHatchPattern(
  ctx: CanvasRenderingContext2D,
  isDark: boolean,
): CanvasPattern | null {
  const tile = document.createElement("canvas");
  tile.width = 8;
  tile.height = 8;
  const tctx = tile.getContext("2d");
  if (!tctx) return null;
  tctx.fillStyle = isDark ? "#14171b" : "#f7f7f3";
  tctx.fillRect(0, 0, 8, 8);
  tctx.strokeStyle = isDark ? "rgba(255,255,255,0.22)" : "rgba(16,18,20,0.28)";
  tctx.lineWidth = 1;
  tctx.beginPath();
  tctx.moveTo(0, 8);
  tctx.lineTo(8, 0);
  tctx.stroke();
  return ctx.createPattern(tile, "repeat");
}

export function BessKarteCanvas3d({
  geoJson,
  bundeslaender,
  sites,
  modus,
  maxScaleValue,
  showAbregelung,
  selectedLok,
  onSelectSite,
  camera,
  onCameraChange,
  onResetCamera,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hitBoxesRef = useRef<HitBox[]>([]);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startCam: Camera3d;
    moved: boolean;
  } | null>(null);

  const [size, setSize] = useState({ width: 720, height: 560 });
  const [isDark, setIsDark] = useState(false);
  const [hoveredSite, setHoveredSite] = useState<KarteSite | null>(null);
  const [dragging, setDragging] = useState(false);

  const preparedPolys = useMemo<PreparedPoly[]>(() => {
    return geoJson.features.map((feat) => {
      const polygons =
        feat.geometry.type === "Polygon"
          ? [feat.geometry.coordinates]
          : feat.geometry.coordinates;
      const rings: Point2d[][] = [];
      for (const poly of polygons) {
        for (const ring of poly) {
          rings.push(ring.map((c) => geoToPlane(c[0]!, c[1]!)));
        }
      }
      return { name: feat.properties.name, rings };
    });
  }, [geoJson]);

  const abregMap = useMemo(() => {
    const m = new Map<string, number | null>();
    let maxGwh = 0;
    for (const b of bundeslaender) {
      m.set(b.bundesland, b.abregelung2025Gwh);
      if (b.abregelung2025Gwh !== null && b.abregelung2025Gwh > maxGwh) {
        maxGwh = b.abregelung2025Gwh;
      }
    }
    return { map: m, maxGwh };
  }, [bundeslaender]);

  const siteCoords = useMemo(() => {
    return sites.map((site) => ({
      site,
      plane: geoToPlane(site.lng, site.lat),
    }));
  }, [sites]);

  const cityCoords = useMemo(() => {
    return ORIENTIERUNGS_STAEDTE.map((c) => ({
      name: c.name,
      plane: geoToPlane(c.lng, c.lat),
    }));
  }, []);

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

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(320, Math.round(entry.contentRect.width));
      const h = Math.max(460, Math.min(600, Math.round(w * 0.78)));
      setSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (
      canvas.width !== Math.round(size.width * dpr) ||
      canvas.height !== Math.round(size.height * dpr)
    ) {
      canvas.width = Math.round(size.width * dpr);
      canvas.height = Math.round(size.height * dpr);
    }

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);

    const params = createProjectionParams3d(camera, size.width, size.height);
    const nullPattern = showAbregelung
      ? createNullHatchPattern(ctx, isDark)
      : null;

    // 1. Subtiler Boden-Schatten unter Deutschland-Umriss
    ctx.save();
    ctx.translate(0, 5);
    ctx.fillStyle = isDark ? "rgba(0, 0, 0, 0.35)" : "rgba(16, 18, 20, 0.06)";
    for (const poly of preparedPolys) {
      ctx.beginPath();
      for (const ring of poly.rings) {
        for (let i = 0; i < ring.length; i += 1) {
          const pt = ring[i]!;
          const p = projectPoint3d(pt.x, pt.y, 0, params);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
      }
      ctx.fill();
    }
    ctx.restore();

    // 2. Bundesländer-Flächen und ruhige Grenzen
    const landFillDefault = isDark ? "#171b20" : "#efefe9";
    const borderStroke = isDark ? "#6b7480" : "#7d7d75";
    ctx.lineJoin = "round";
    ctx.lineWidth = 1.5;

    for (const poly of preparedPolys) {
      ctx.beginPath();
      for (const ring of poly.rings) {
        for (let i = 0; i < ring.length; i += 1) {
          const pt = ring[i]!;
          const p = projectPoint3d(pt.x, pt.y, 0, params);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
      }
      if (showAbregelung) {
        const gwh = abregMap.map.get(poly.name) ?? null;
        if (gwh === null && nullPattern) {
          ctx.fillStyle = nullPattern;
        } else {
          ctx.fillStyle = abregelungColor(gwh, abregMap.maxGwh, isDark);
        }
      } else {
        ctx.fillStyle = landFillDefault;
      }
      ctx.fill();
      ctx.strokeStyle = borderStroke;
      ctx.stroke();
    }

    // 3. Orientierungsstädte (Punkte auf Bodenebene)
    const cityDotColor = isDark ? "rgba(233,238,242,0.55)" : "rgba(16,18,20,0.42)";
    const projectedCities = cityCoords.map((c) => ({
      name: c.name,
      p: projectPoint3d(c.plane.x, c.plane.y, 0, params),
    }));
    ctx.fillStyle = cityDotColor;
    for (const c of projectedCities) {
      ctx.beginPath();
      ctx.arc(c.p.x, c.p.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. 3D-Säulen (Painter-Sortierung von hinten nach vorne)
    const maxColHeight = 0.5;
    const baseHalfW = 0.0072;

    const sortedItems = siteCoords
      .map(({ site, plane }) => {
        const val = modus === "mwh" ? site.kapMwh : site.nettoMw;
        const h = saeulenHoehe(val, maxScaleValue, maxColHeight);
        const depthBase = projectPoint3d(plane.x, plane.y, 0, params).depth;
        return { site, plane, h, depthBase };
      })
      .sort((a, b) => a.depthBase - b.depthBase || a.h - b.h);

    const warmTop = isDark ? "#f4977b" : "#d96d3f";
    const warmLit = isDark ? "#e76f51" : "#b4532a";
    const warmDark = isDark ? "#973c26" : "#763115";

    const selTop = isDark ? "#a7fff1" : "#1f9c83";
    const selLit = isDark ? "#7dfce6" : "#147b66";
    const selDark = isDark ? "#289c8a" : "#0b4f41";

    const hoverTop = isDark ? "#ffb59c" : "#ea8253";

    const edgeColor = isDark ? "rgba(11, 13, 15, 0.42)" : "rgba(16, 18, 20, 0.18)";
    const newHitBoxes: HitBox[] = [];

    for (const item of sortedItems) {
      const isSelected = item.site.lok === selectedLok;
      const isHovered = hoveredSite?.lok === item.site.lok;
      const hw = isSelected ? baseHalfW * 1.35 : isHovered ? baseHalfW * 1.18 : baseHalfW;
      const h = Math.max(0.015, item.h);
      const cuboid = projectCuboid(item.plane.x, item.plane.y, hw, h, params);

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(cuboid.baseCenter.x, cuboid.baseCenter.y, 9, 0, Math.PI * 2);
        ctx.strokeStyle = selLit;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const litColor = isSelected ? selLit : warmLit;
      const darkColor = isSelected ? selDark : warmDark;
      const topColor = isSelected ? selTop : isHovered ? hoverTop : warmTop;

      // Seitenflächen
      for (const face of cuboid.visibleSides) {
        ctx.beginPath();
        ctx.moveTo(face.corners[0].x, face.corners[0].y);
        ctx.lineTo(face.corners[1].x, face.corners[1].y);
        ctx.lineTo(face.corners[2].x, face.corners[2].y);
        ctx.lineTo(face.corners[3].x, face.corners[3].y);
        ctx.closePath();
        ctx.fillStyle = mixHex(darkColor, litColor, face.shade);
        ctx.fill();
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // Deckfläche
      ctx.beginPath();
      ctx.moveTo(cuboid.topFace[0].x, cuboid.topFace[0].y);
      ctx.lineTo(cuboid.topFace[1].x, cuboid.topFace[1].y);
      ctx.lineTo(cuboid.topFace[2].x, cuboid.topFace[2].y);
      ctx.lineTo(cuboid.topFace[3].x, cuboid.topFace[3].y);
      ctx.closePath();
      ctx.fillStyle = topColor;
      ctx.fill();
      ctx.strokeStyle = isSelected || isHovered ? (isDark ? "#ffffff" : "#101214") : edgeColor;
      ctx.lineWidth = isSelected ? 1.2 : isHovered ? 0.9 : 0.6;
      ctx.stroke();

      newHitBoxes.push({
        site: item.site,
        minX: cuboid.minX,
        maxX: cuboid.maxX,
        minY: cuboid.minY,
        maxY: cuboid.maxY,
        topX: cuboid.topCenter.x,
        topY: cuboid.topCenter.y,
      });
    }

    hitBoxesRef.current = newHitBoxes;

    // 5. Orientierungsstädte Beschriftung (mit dezenter Halo)
    ctx.font = "500 11px ui-sans-serif, system-ui, -apple-system, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    const labelFill = isDark ? "rgba(233, 238, 242, 0.85)" : "rgba(16, 18, 20, 0.78)";
    const labelHalo = isDark ? "rgba(11, 13, 15, 0.82)" : "rgba(246, 246, 243, 0.86)";
    for (const c of projectedCities) {
      const tx = c.p.x + 5;
      const ty = c.p.y - 1;
      ctx.lineWidth = 3;
      ctx.strokeStyle = labelHalo;
      ctx.strokeText(c.name, tx, ty);
      ctx.fillStyle = labelFill;
      ctx.fillText(c.name, tx, ty);
    }

    ctx.restore();
  }, [
    size,
    camera,
    isDark,
    preparedPolys,
    abregMap,
    showAbregelung,
    siteCoords,
    cityCoords,
    modus,
    maxScaleValue,
    selectedLok,
    hoveredSite,
  ]);

  function findHit(clientX: number, clientY: number): KarteSite | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const boxes = hitBoxesRef.current;
    const pad = 6;
    // Von vorne nach hinten prüfen (umgekehrte Painter-Reihenfolge)
    for (let i = boxes.length - 1; i >= 0; i -= 1) {
      const b = boxes[i]!;
      if (x >= b.minX - pad && x <= b.maxX + pad && y >= b.minY - pad && y <= b.maxY + pad) {
        return b.site;
      }
    }
    return null;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startCam: camera,
      moved: false,
    };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (drag && drag.pointerId === e.pointerId) {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) > 4) {
        drag.moved = true;
        setDragging(true);
        setHoveredSite(null);
      }
      if (drag.moved) {
        onCameraChange(
          clampCamera3d({
            ...drag.startCam,
            yawDeg: drag.startCam.yawDeg + dx * 0.42,
            tiltDeg: drag.startCam.tiltDeg + dy * 0.3,
          }),
        );
      }
      return;
    }

    const hit = findHit(e.clientX, e.clientY);
    setHoveredSite((prev) => (prev?.lok === hit?.lok ? prev : hit));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (drag && drag.pointerId === e.pointerId) {
      const wasDrag = drag.moved;
      dragRef.current = null;
      setDragging(false);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      if (!wasDrag) {
        const hit = findHit(e.clientX, e.clientY);
        onSelectSite(hit);
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLCanvasElement>) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      onCameraChange(clampCamera3d({ ...camera, yawDeg: camera.yawDeg - 10 }));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      onCameraChange(clampCamera3d({ ...camera, yawDeg: camera.yawDeg + 10 }));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      onCameraChange(clampCamera3d({ ...camera, tiltDeg: camera.tiltDeg - 6 }));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      onCameraChange(clampCamera3d({ ...camera, tiltDeg: camera.tiltDeg + 6 }));
    } else if (e.key === "0" || e.key === "r" || e.key === "R") {
      e.preventDefault();
      onResetCamera();
    }
  }

  return (
    <div ref={wrapRef} className={styles.canvasStageWrap}>
      <canvas
        ref={canvasRef}
        className={styles.canvas3d}
        style={{
          width: `${size.width}px`,
          height: `${size.height}px`,
          cursor: dragging ? "grabbing" : hoveredSite ? "pointer" : "grab",
        }}
        tabIndex={0}
        role="img"
        aria-label="Interaktive 3D-Säulenkarte der Batteriespeicher ab 1 MW in Deutschland. Mit Maus oder Pfeiltasten drehen und neigen, Säule anklicken für Details."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => {
          if (!dragRef.current) setHoveredSite(null);
        }}
        onKeyDown={handleKeyDown}
      />

      <div className={styles.canvasOverlayTop}>
        <span className={`${styles.canvasHint} num`}>
          Ziehen zum Drehen &amp; Neigen · Klick auf Säule für Details
        </span>
        <div className={styles.canvasCamBtns}>
          <button
            type="button"
            className={styles.camBtn}
            onClick={() =>
              onCameraChange(clampCamera3d({ ...camera, yawDeg: camera.yawDeg - 20 }))
            }
            aria-label="Karte nach links drehen"
            title="Nach links drehen"
          >
            ⟲
          </button>
          <button
            type="button"
            className={styles.camBtn}
            onClick={() =>
              onCameraChange(clampCamera3d({ ...camera, yawDeg: camera.yawDeg + 20 }))
            }
            aria-label="Karte nach rechts drehen"
            title="Nach rechts drehen"
          >
            ⟳
          </button>
          <button
            type="button"
            className={styles.camBtn}
            onClick={() =>
              onCameraChange(
                clampCamera3d({
                  ...camera,
                  tiltDeg: camera.tiltDeg > 25 ? 14 : 48,
                }),
              )
            }
            aria-label={camera.tiltDeg > 25 ? "In Draufsicht wechseln" : "In 3D-Neigung wechseln"}
          >
            {camera.tiltDeg > 25 ? "Draufsicht" : "3D"}
          </button>
          <button
            type="button"
            className={styles.camBtn}
            onClick={onResetCamera}
          >
            Zurücksetzen
          </button>
        </div>
      </div>

      {hoveredSite ? (
        <div className={styles.canvasHoverPill} role="status" aria-live="polite">
          <strong>{mastrNameNbsp(hoveredSite.name)}</strong>
          <span className="num">
            {hoveredSite.lk} ({hoveredSite.bl}) ·{" "}
            {insertDisplayUnitNbsp(formatQuantityUnit(hoveredSite.nettoMw, "de", 1, "MW"))} netto ·{" "}
            {insertDisplayUnitNbsp(formatQuantityUnit(hoveredSite.kapMwh, "de", 1, "MWh"))}
          </span>
        </div>
      ) : null}
    </div>
  );
}
