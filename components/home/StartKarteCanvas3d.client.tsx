"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ORIENTIERUNGS_STAEDTE, previewSitesAtMonat, saeulenHoehe } from "@/lib/bessKarte3d/logic";
import {
  createProjectionParams3d,
  DEFAULT_CAMERA_3D,
  geoToPlane,
  type Point2d,
  projectCuboid,
  projectPoint3d,
  screenCross2d,
} from "@/lib/bessKarte3d/projection3d";
import type { BundeslaenderGeoJson, KartePreviewSite } from "@/lib/bessKarte3d/types";
import styles from "@/components/home/StartKarteSektion.module.css";

const LAND_DEPTH = 0.075;

type PreparedPoly = {
  name: string;
  rings: Point2d[][];
};

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

/**
 * 3D-Startansicht (DEFAULT_CAMERA_3D) auf Desktop (>= 768 px):
 * ohne Zeiger-Handler; Zeitablauf einmal automatisch, sobald sichtbar.
 */
export function StartKarteCanvas3d({
  geoJson,
  sites,
  monate,
  maxScaleValue,
  ariaLabel,
}: {
  geoJson: BundeslaenderGeoJson;
  sites: readonly KartePreviewSite[];
  monate: readonly string[];
  maxScaleValue: number;
  ariaLabel: string;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playedRef = useRef(false);
  const lastMonatIdx = Math.max(0, monate.length - 1);
  const [size, setSize] = useState({ width: 640, height: 500 });
  const [isDark, setIsDark] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [monatIdx, setMonatIdx] = useState(0);

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

  const visibleSites = useMemo(() => {
    const monat = monate[monatIdx] ?? monate[lastMonatIdx] ?? "9999-12";
    return previewSitesAtMonat(sites, monat);
  }, [sites, monate, monatIdx, lastMonatIdx]);

  const siteCoords = useMemo(() => {
    return visibleSites.map((site) => ({
      site,
      plane: geoToPlane(site.lng, site.lat),
    }));
  }, [visibleSites]);

  const cityCoords = useMemo(() => {
    return ORIENTIERUNGS_STAEDTE.map((c) => ({
      name: c.name,
      plane: geoToPlane(c.lng, c.lat),
    }));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isDesktop || monate.length === 0) return;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      playedRef.current = true;
      setMonatIdx(lastMonatIdx);
      return;
    }
    if (playedRef.current) {
      setMonatIdx(lastMonatIdx);
      return;
    }
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setMonatIdx(0);
      return;
    }
    setMonatIdx(0);
    let intervalId: number | null = null;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (!visible || playedRef.current) return;
        playedRef.current = true;
        setMonatIdx(0);
        intervalId = window.setInterval(() => {
          setMonatIdx((prev) => {
            if (prev >= lastMonatIdx) {
              if (intervalId != null) window.clearInterval(intervalId);
              intervalId = null;
              return lastMonatIdx;
            }
            return prev + 1;
          });
        }, 120);
        obs.disconnect();
      },
      { threshold: [0, 0.35, 0.6] },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (intervalId != null) window.clearInterval(intervalId);
    };
  }, [isDesktop, monate.length, lastMonatIdx]);

  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains("dark"));
    checkDark();
    const obs = new MutationObserver(checkDark);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(320, Math.round(entry.contentRect.width));
      const h = Math.max(380, Math.min(520, Math.round(w * 0.78)));
      setSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [isDesktop]);

  useEffect(() => {
    if (!isDesktop) return;
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

    const camera = DEFAULT_CAMERA_3D;
    const params = createProjectionParams3d(camera, size.width, size.height, "default");

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

    // 1b. Landplatte als Körper
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

    // 2. Bundesländer-Flächen und Grenzen
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
      ctx.fillStyle = landFillDefault;
      ctx.fill();
      ctx.strokeStyle = borderStroke;
      ctx.stroke();
    }

    // 3. Orientierungsstädte (Punkte)
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

    // 4. 3D-Säulen (Painter-Sortierung)
    const zoomDamp = Math.max(1, camera.zoom);
    const maxColHeight = 0.5 / Math.pow(zoomDamp, 0.55);
    const baseHalfW = 0.0072 / Math.pow(zoomDamp, 0.7);

    const sortedItems = siteCoords
      .map(({ site, plane }) => {
        const h = saeulenHoehe(site.nettoMw, maxScaleValue, maxColHeight);
        const depthBase = projectPoint3d(plane.x, plane.y, 0, params).depth;
        return { plane, h, depthBase };
      })
      .sort((a, b) => a.depthBase - b.depthBase || a.h - b.h);

    const warmTop = isDark ? "#f4977b" : "#d96d3f";
    const warmLit = isDark ? "#e76f51" : "#b4532a";
    const warmDark = isDark ? "#973c26" : "#763115";
    const edgeColor = isDark ? "rgba(11, 13, 15, 0.42)" : "rgba(16, 18, 20, 0.18)";

    for (const item of sortedItems) {
      const h = Math.max(0.015, item.h);
      const cuboid = projectCuboid(item.plane.x, item.plane.y, baseHalfW, h, params);

      for (const face of cuboid.visibleSides) {
        ctx.beginPath();
        ctx.moveTo(face.corners[0].x, face.corners[0].y);
        ctx.lineTo(face.corners[1].x, face.corners[1].y);
        ctx.lineTo(face.corners[2].x, face.corners[2].y);
        ctx.lineTo(face.corners[3].x, face.corners[3].y);
        ctx.closePath();
        ctx.fillStyle = mixHex(warmDark, warmLit, face.shade);
        ctx.fill();
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.moveTo(cuboid.topFace[0].x, cuboid.topFace[0].y);
      ctx.lineTo(cuboid.topFace[1].x, cuboid.topFace[1].y);
      ctx.lineTo(cuboid.topFace[2].x, cuboid.topFace[2].y);
      ctx.lineTo(cuboid.topFace[3].x, cuboid.topFace[3].y);
      ctx.closePath();
      ctx.fillStyle = warmTop;
      ctx.fill();
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    // 5. Orientierungsstädte Beschriftung
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
  }, [isDesktop, size, isDark, preparedPolys, siteCoords, cityCoords, maxScaleValue]);

  return (
    <div ref={wrapRef} className={styles.canvasWrap}>
      <canvas
        ref={canvasRef}
        className={styles.canvas3d}
        style={{ height: `${size.height}px` }}
        role="img"
        aria-label={ariaLabel}
      />
    </div>
  );
}
