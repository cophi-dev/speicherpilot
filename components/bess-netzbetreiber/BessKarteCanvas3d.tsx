"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import {
  abregelungOhneOffshore,
  ORIENTIERUNGS_STAEDTE,
  mastrNameNbsp,
  saeulenHoehe,
} from "@/lib/bessKarte3d/logic";
import {
  type Camera3d,
  clampCamera3d,
  createProjectionParams3d,
  DEFAULT_CAMERA_3D,
  geoToPlane,
  panCameraBy,
  type Point2d,
  type ProjectionFit,
  projectCuboid,
  projectPoint3d,
  screenCross2d,
  ZOOM_MAX,
  ZOOM_MIN,
  zoomCameraAt,
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
  /** Hero: größere Bühne, ohne Rahmen. */
  hero?: boolean;
  /** Mobil wie #156: Ein-Finger pan-y (Seite scrollt, Antippen wählt), Zwei-Finger drehen/zoomen. */
  touchFriendly?: boolean;
  overlay?: ReactNode;
  /** Unten links auf der Bühne: Höhenlegende und kurze BKG-Zeile. */
  footOverlay?: ReactNode;
};

/** Dicke der Landplatte (Ebenen-Einheiten, 1 ≈ 470 km). */
const LAND_DEPTH = 0.075;
const ZOOM_STEP = 1.45;

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
  hero = false,
  touchFriendly = false,
  overlay,
  footOverlay,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const hitBoxesRef = useRef<HitBox[]>([]);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startCam: Camera3d;
    moved: boolean;
    pan: boolean;
  } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; midX: number; midY: number } | null>(null);
  const tapRef = useRef<{ pointerId: number; startX: number; startY: number } | null>(null);
  const cameraRef = useRef(camera);
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);
  const sizeRef = useRef({ width: 720, height: 560 });
  const [wheelActive, setWheelActive] = useState(false);
  const wheelActiveRef = useRef(false);
  useEffect(() => {
    wheelActiveRef.current = wheelActive;
  }, [wheelActive]);
  const [wheelHint, setWheelHint] = useState(false);
  const wheelHintTimer = useRef<number | null>(null);

  const [size, setSize] = useState({ width: 720, height: 560 });
  const [isDark, setIsDark] = useState(false);
  const [hoveredSite, setHoveredSite] = useState<KarteSite | null>(null);
  const [dragging, setDragging] = useState(false);
  const [canvasBlocked, setCanvasBlocked] = useState(false);
  const projFit: ProjectionFit = touchFriendly ? "mobile" : "default";

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
      // Fläche: EE-Redispatch 2025 ohne Wind Offshore (BMWE-Gesamt minus Offshore-Anteil)
      const gwh = abregelungOhneOffshore(b);
      m.set(b.bundesland, gwh);
      if (gwh !== null && gwh > maxGwh) {
        maxGwh = gwh;
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
      const narrow = w < 768;
      const h = hero
        ? narrow
          ? Math.max(430, Math.min(Math.round(window.innerHeight * 0.56), Math.round(w * 1.32)))
          : Math.max(540, Math.min(820, Math.round(window.innerHeight * 0.71), Math.round(w * 0.70)))
        : narrow
          ? Math.max(420, Math.min(540, Math.round(w * 1.35)))
          : Math.max(460, Math.min(600, Math.round(w * 0.76)));
      setSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hero]);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  // Mausrad zoomt nur mit Strg/⌘ oder nachdem die Karte angeklickt wurde; sonst scrollt die Seite
  // weiter und ein dezenter Hinweis erscheint.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey || wheelActiveRef.current)) {
        setWheelHint(true);
        if (wheelHintTimer.current) window.clearTimeout(wheelHintTimer.current);
        wheelHintTimer.current = window.setTimeout(() => setWheelHint(false), 1600);
        return;
      }
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const factor = Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * 0.006);
      const { width, height } = sizeRef.current;
      onCameraChange(
        zoomCameraAt(
          cameraRef.current,
          factor,
          e.clientX - rect.left,
          e.clientY - rect.top,
          width,
          height,
          touchFriendly ? "mobile" : "default",
        ),
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (wheelHintTimer.current) window.clearTimeout(wheelHintTimer.current);
    };
  }, [onCameraChange, touchFriendly]);

  // Ein Finger bleibt pan-y (Seite scrollt). touch-action wird beim Gestenstart festgeschrieben,
  // darum preventDefault erst ab dem zweiten Finger (wie #156).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !touchFriendly) return;
    const blockTwoFinger = (e: TouchEvent) => {
      if (e.touches.length >= 2) e.preventDefault();
    };
    el.addEventListener("touchstart", blockTwoFinger, { passive: false });
    el.addEventListener("touchmove", blockTwoFinger, { passive: false });
    return () => {
      el.removeEventListener("touchstart", blockTwoFinger);
      el.removeEventListener("touchmove", blockTwoFinger);
    };
  }, [touchFriendly]);

  // Roving-tabindex fallback for desktop camera toolbar when native focusgroup is unavailable.
  useEffect(() => {
    const bar = toolbarRef.current;
    if (!bar || touchFriendly || "focusGroup" in HTMLElement.prototype) return;
    const items = Array.from(bar.querySelectorAll<HTMLButtonElement>("button"));
    if (items.length === 0) return;
    items.forEach((b, i) => {
      b.tabIndex = i === 0 ? 0 : -1;
    });
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLButtonElement | null;
      if (target && items.includes(target)) {
        items.forEach((b) => {
          b.tabIndex = b === target ? 0 : -1;
        });
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const idx = items.indexOf(document.activeElement as HTMLButtonElement);
      if (idx === -1) return;
      const rtl = getComputedStyle(bar).direction === "rtl";
      let nextIdx: number | null = null;
      if (e.key === "ArrowRight") nextIdx = (idx + (rtl ? -1 : 1) + items.length) % items.length;
      else if (e.key === "ArrowLeft") nextIdx = (idx + (rtl ? 1 : -1) + items.length) % items.length;
      else if (e.key === "Home") nextIdx = 0;
      else if (e.key === "End") nextIdx = items.length - 1;
      if (nextIdx !== null) {
        e.preventDefault();
        items[nextIdx]!.focus();
      }
    };
    bar.addEventListener("focusin", onFocusIn);
    bar.addEventListener("keydown", onKeyDown);
    return () => {
      bar.removeEventListener("focusin", onFocusIn);
      bar.removeEventListener("keydown", onKeyDown);
    };
  }, [touchFriendly]);

  function zoomBy(factor: number) {
    const { width, height } = sizeRef.current;
    const params = createProjectionParams3d(camera, width, height, projFit);
    onCameraChange(zoomCameraAt(camera, factor, params.cx, params.cy, width, height, projFit));
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCanvasBlocked((prev) => (prev ? prev : true));
      return;
    }
    setCanvasBlocked((prev) => (prev ? false : prev));

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

    const params = createProjectionParams3d(camera, size.width, size.height, projFit);
    const nullPattern = showAbregelung
      ? createNullHatchPattern(ctx, isDark)
      : null;

    // 1. Weicher Boden-Schatten unter der Landplatte
    ctx.save();
    ctx.fillStyle = isDark ? "rgba(0, 0, 0, 0.32)" : "rgba(16, 18, 20, 0.07)";
    ctx.filter = "blur(6px)";
    for (const poly of preparedPolys) {
      ctx.beginPath();
      for (const ring of poly.rings) {
        for (let i = 0; i < ring.length; i += 1) {
          const pt = ring[i]!;
          const p = projectPoint3d(pt.x + 0.01, pt.y - 0.02, -LAND_DEPTH, params);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
      }
      ctx.fill();
    }
    ctx.restore();

    // 1b. Landplatte als Körper: Seitenwände von z = −LAND_DEPTH bis 0, von hinten nach vorne.
    const walls: { pts: [Point2d, Point2d, Point2d, Point2d]; depth: number; shade: number }[] = [];
    for (const poly of preparedPolys) {
      for (const ring of poly.rings) {
        for (let i = 0; i < ring.length - 1; i += 1) {
          const a = ring[i]!;
          const b = ring[i + 1]!;
          const a0 = projectPoint3d(a.x, a.y, 0, params);
          const b0 = projectPoint3d(b.x, b.y, 0, params);
          const a1 = projectPoint3d(a.x, a.y, -LAND_DEPTH, params);
          const b1 = projectPoint3d(b.x, b.y, -LAND_DEPTH, params);
          // Nur Kanten, deren Wand nach vorne (unten im Bild) zeigt, sind sichtbar.
          const cross = screenCross2d(a0, b0, b1);
          if (Math.abs(cross) < 1e-3) continue;
          const ex = b0.x - a0.x;
          const ey = b0.y - a0.y;
          const len = Math.hypot(ex, ey) || 1;
          let nx = -ey / len;
          let ny = ex / len;
          if (ny < 0) {
            nx = -nx;
            ny = -ny;
          }
          const shade = Math.max(0, Math.min(1, 0.55 + 0.45 * (nx * -0.6 + ny * 0.8)));
          walls.push({ pts: [a0, b0, b1, a1], depth: (a0.depth + b0.depth) / 2, shade });
        }
      }
    }
    walls.sort((x, y) => x.depth - y.depth);
    const wallLit = isDark ? "#3a414a" : "#d4d4cc";
    const wallDark = isDark ? "#1a1e23" : "#a9a9a0";
    for (const w of walls) {
      ctx.beginPath();
      ctx.moveTo(w.pts[0].x, w.pts[0].y);
      ctx.lineTo(w.pts[1].x, w.pts[1].y);
      ctx.lineTo(w.pts[2].x, w.pts[2].y);
      ctx.lineTo(w.pts[3].x, w.pts[3].y);
      ctx.closePath();
      const c = mixHex(wallDark, wallLit, w.shade);
      ctx.fillStyle = c;
      ctx.strokeStyle = c;
      ctx.lineWidth = 0.6;
      ctx.fill();
      ctx.stroke();
    }

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
    // Beim Hineinzoomen wachsen Säulen langsamer als die Karte, damit einzelne Lokationen trennbar bleiben.
    const zoomDamp = Math.max(1, camera.zoom);
    let maxColHeight = 0.5 / Math.pow(zoomDamp, 0.55);
    const baseHalfW = 0.0072 / Math.pow(zoomDamp, 0.7);
    if (touchFriendly) {
      const pxPerUnit = params.scale * Math.max(0.22, params.sinT);
      const cap = (size.height * 0.25) / Math.max(pxPerUnit, 1e-6);
      maxColHeight = Math.min(maxColHeight, cap);
    }

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
    touchFriendly,
    projFit,
  ]);

  function findHit(clientX: number, clientY: number): KarteSite | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const boxes = hitBoxesRef.current;
    const pad = touchFriendly ? 12 : 6;
    // Von vorne nach hinten prüfen (umgekehrte Painter-Reihenfolge)
    for (let i = boxes.length - 1; i >= 0; i -= 1) {
      const b = boxes[i]!;
      if (x >= b.minX - pad && x <= b.maxX + pad && y >= b.minY - pad && y <= b.maxY + pad) {
        return b.site;
      }
    }
    return null;
  }

  function pinchState() {
    const pts = [...pointersRef.current.values()];
    if (pts.length < 2) return null;
    const [p, q] = [pts[0]!, pts[1]!];
    return { dist: Math.hypot(p.x - q.x, p.y - q.y), midX: (p.x + q.x) / 2, midY: (p.y + q.y) / 2 };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    setWheelActive(true);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Mobil: ein Finger scrollt oder tippt eine Säule; erst der zweite Finger greift die Kamera.
    if (e.pointerType === "touch") {
      if (pointersRef.current.size >= 2) {
        dragRef.current = null;
        tapRef.current = null;
        setDragging(false);
        pinchRef.current = pinchState();
        try {
          for (const id of pointersRef.current.keys()) {
            e.currentTarget.setPointerCapture(id);
          }
        } catch {
          /* Capture kann fehlen, wenn der erste Finger schon losgelassen wurde. */
        }
      } else {
        tapRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY };
      }
      return;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* Capture kann bei synthetischen oder bereits beendeten Pointern fehlen. */
    }

    if (pointersRef.current.size >= 2) {
      dragRef.current = null;
      pinchRef.current = pinchState();
      return;
    }

    const curCam = cameraRef.current;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startCam: curCam,
      moved: false,
      // Ohne Zoom dreht Ziehen die Karte; hineingezoomt verschiebt es sie (Shift dreht immer).
      pan: curCam.zoom > DEFAULT_CAMERA_3D.zoom + 0.05 && !e.shiftKey,
    };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (pinchRef.current && pointersRef.current.size >= 2) {
      const now = pinchState();
      const prev = pinchRef.current;
      if (now && prev.dist > 0) {
        const rect = e.currentTarget.getBoundingClientRect();
        const { width, height } = sizeRef.current;
        let next = zoomCameraAt(
          cameraRef.current,
          now.dist / prev.dist,
          now.midX - rect.left,
          now.midY - rect.top,
          width,
          height,
          projFit,
        );
        if (e.pointerType === "touch") {
          next = clampCamera3d({
            ...next,
            yawDeg: next.yawDeg + (now.midX - prev.midX) * 0.42,
            tiltDeg: next.tiltDeg + (now.midY - prev.midY) * 0.3,
          });
        } else {
          next = panCameraBy(next, now.midX - prev.midX, now.midY - prev.midY, width, height, projFit);
        }
        cameraRef.current = next;
        onCameraChange(next);
        pinchRef.current = now;
      }
      return;
    }
    if (e.pointerType === "touch") return;
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
        let next: Camera3d;
        if (drag.pan) {
          const { width, height } = sizeRef.current;
          next = panCameraBy(drag.startCam, dx, dy, width, height, projFit);
        } else {
          next = clampCamera3d({
            ...drag.startCam,
            yawDeg: drag.startCam.yawDeg + dx * 0.42,
            tiltDeg: drag.startCam.tiltDeg + dy * 0.3,
          });
        }
        cameraRef.current = next;
        onCameraChange(next);
      }
      return;
    }

    const hit = findHit(e.clientX, e.clientY);
    setHoveredSite((prev) => (prev?.lok === hit?.lok ? prev : hit));
  }

  function handlePointerCancel(e: React.PointerEvent<HTMLCanvasElement>) {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (tapRef.current?.pointerId === e.pointerId) tapRef.current = null;
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    pointersRef.current.delete(e.pointerId);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (pinchRef.current) {
      if (pointersRef.current.size < 2) pinchRef.current = null;
      dragRef.current = null;
      setDragging(false);
      return;
    }
    const tap = tapRef.current;
    if (tap && tap.pointerId === e.pointerId) {
      tapRef.current = null;
      if (Math.hypot(e.clientX - tap.startX, e.clientY - tap.startY) <= 8) {
        onSelectSite(findHit(e.clientX, e.clientY));
      }
      return;
    }
    const drag = dragRef.current;
    if (drag && drag.pointerId === e.pointerId) {
      const wasDrag = drag.moved;
      dragRef.current = null;
      setDragging(false);
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
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      zoomBy(ZOOM_STEP);
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      zoomBy(1 / ZOOM_STEP);
    } else if (e.key === "0" || e.key === "r" || e.key === "R") {
      e.preventDefault();
      onResetCamera();
    }
  }

  const zoomAtMax = camera.zoom >= ZOOM_MAX - 1e-6;
  const zoomAtMin = camera.zoom <= ZOOM_MIN + 1e-6;
  const is3dTilt = camera.tiltDeg > 25;

  return (
    <div
      ref={wrapRef}
      className={[
        styles.canvasStageWrap,
        hero ? styles.canvasStageHero : "",
        touchFriendly ? styles.canvasStageTouch : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseLeave={() => setWheelActive(false)}
    >
      <div className={styles.canvasMedia}>
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
          aria-label={
            touchFriendly
              ? "Interaktive 3D-Säulenkarte der Batteriespeicher ab 1 MW in Deutschland. Mit einem Finger die Seite scrollen, mit zwei Fingern drehen und zoomen, Säule antippen für Details."
              : "Interaktive 3D-Säulenkarte der Batteriespeicher ab 1 MW in Deutschland. Mit Maus oder Pfeiltasten drehen und neigen, mit Plus und Minus zoomen, Säule anklicken für Details."
          }
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={() => {
            if (!dragRef.current) setHoveredSite(null);
          }}
          onKeyDown={handleKeyDown}
        />

        {overlay ? (
          <div
            className={styles.canvasHeroOverlay}
            style={{ opacity: camera.zoom > DEFAULT_CAMERA_3D.zoom + 0.15 ? 0 : 1 }}
            aria-hidden={camera.zoom > DEFAULT_CAMERA_3D.zoom + 0.15 ? true : undefined}
          >
            {overlay}
          </div>
        ) : null}

        {footOverlay ? <div className={styles.canvasFootOverlay}>{footOverlay}</div> : null}

        {wheelHint ? (
          <div className={`${styles.wheelHint} num`} role="status" aria-live="polite">
            Zum Zoomen Strg/⌘ + Mausrad oder erst auf die Karte klicken
          </div>
        ) : null}

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

      {canvasBlocked ? (
        <p className={styles.canvasFallback} role="status">
          Die 3D-Karte kann auf diesem Gerät nicht gezeichnet werden. Die Standorte lassen sich
          weiterhin über die Liste darunter wählen.
        </p>
      ) : null}

      {touchFriendly ? (
        <div className={styles.canvasToolbar}>
          <p className={`${styles.canvasHint} ${styles.canvasToolbarHint} num`}>
            Ein Finger: Seite scrollen · Zwei Finger: drehen und zoomen · Antippen: Details
          </p>
          <div className={styles.canvasToolbarRow} role="group" aria-label="Kartenansicht">
            <div className={styles.canvasToolbarCluster}>
              <button
                type="button"
                className={`${styles.camBtn} ${styles.camBtnCircle}`}
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
                className={`${styles.camBtn} ${styles.camBtnCircle}`}
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
                className={`${styles.camBtn} ${styles.camBtnCircle}`}
                onClick={() => zoomBy(ZOOM_STEP)}
                disabled={zoomAtMax}
                aria-label="Hineinzoomen"
                title="Hineinzoomen (+)"
              >
                +
              </button>
              <button
                type="button"
                className={`${styles.camBtn} ${styles.camBtnCircle}`}
                onClick={() => zoomBy(1 / ZOOM_STEP)}
                disabled={zoomAtMin}
                aria-label="Herauszoomen"
                title="Herauszoomen (−)"
              >
                −
              </button>
              <button
                type="button"
                className={`${styles.camBtn} ${styles.camBtnCircle}`}
                onClick={onResetCamera}
                aria-label="Ansicht zurücksetzen"
                title="Ansicht zurücksetzen (0)"
              >
                ⌂
              </button>
            </div>
            <button
              type="button"
              className={styles.canvasToolbarToggle}
              aria-pressed={is3dTilt}
              aria-label={is3dTilt ? "3D-Neigung aktiv, zur Startansicht wechseln" : "Stärker in 3D neigen"}
              onClick={() =>
                onCameraChange(
                  clampCamera3d({
                    ...camera,
                    tiltDeg: is3dTilt ? DEFAULT_CAMERA_3D.tiltDeg : 48,
                  }),
                )
              }
            >
              3D
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.canvasDesktopBar}>
          <span className={`${styles.canvasHint} num`}>
            {camera.zoom > DEFAULT_CAMERA_3D.zoom + 0.05
              ? "Ziehen: verschieben · Shift + Ziehen: drehen · Säule anklicken: Details"
              : "Ziehen: drehen und neigen · Strg/⌘ + Mausrad: zoomen · Säule anklicken: Details"}
          </span>
          <div
            ref={toolbarRef}
            className={styles.canvasCamToolbar}
            role="toolbar"
            aria-label="Kartenansicht"
            {...({ focusgroup: "toolbar wrap" } as Record<string, string>)}
          >
            <div className={styles.camToolbarGroup} role="group" aria-label="Drehen und Perspektive">
              <button
                type="button"
                className={styles.camGhostBtn}
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
                className={styles.camGhostBtn}
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
                className={`${styles.camGhostBtn} ${styles.camGhostLabel}`}
                aria-pressed={is3dTilt}
                aria-label="3D-Neigung umschalten"
                onClick={() =>
                  onCameraChange(
                    clampCamera3d({
                      ...camera,
                      tiltDeg: is3dTilt ? 14 : 48,
                    }),
                  )
                }
                title="Zwischen 3D-Neigung und Draufsicht wechseln"
              >
                3D
              </button>
            </div>
            <span
              className={styles.camToolbarSep}
              role="separator"
              aria-orientation="vertical"
            />
            <div className={styles.camToolbarGroup} role="group" aria-label="Zoom und Zurücksetzen">
              <button
                type="button"
                className={styles.camGhostBtn}
                onClick={() => {
                  if (!zoomAtMax) zoomBy(ZOOM_STEP);
                }}
                aria-disabled={zoomAtMax || undefined}
                aria-label="Hineinzoomen"
                title="Hineinzoomen (+)"
              >
                +
              </button>
              <button
                type="button"
                className={styles.camGhostBtn}
                onClick={() => {
                  if (!zoomAtMin) zoomBy(1 / ZOOM_STEP);
                }}
                aria-disabled={zoomAtMin || undefined}
                aria-label="Herauszoomen"
                title="Herauszoomen (−)"
              >
                −
              </button>
              <button
                type="button"
                className={styles.camGhostBtn}
                onClick={onResetCamera}
                aria-label="Ansicht zurücksetzen"
                title="Ansicht zurücksetzen (0)"
              >
                ⌂
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
