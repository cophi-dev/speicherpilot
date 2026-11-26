import type { GeoJsonPolygonGeometry } from "@/lib/bessKarte3d/types";

export const DE_CENTER_LNG = 10.45;
export const DE_CENTER_LAT = 51.16;
export const DE_COS_LAT = Math.cos((DE_CENTER_LAT * Math.PI) / 180);
export const DE_HALF_SPAN = 4.25;

export type Camera3d = {
  /** Drehung um die vertikale Z-Achse in Grad. */
  yawDeg: number;
  /** Neigung aus der Draufsicht in Grad (0 = Draufsicht, 75 = flach). */
  tiltDeg: number;
  /** Zoom-Multiplikator (1 = Standard). */
  zoom: number;
  /** Verschiebung des Bildmittelpunkts in Ebenen-Koordinaten (optional, 0 = Deutschland-Mitte). */
  panX?: number;
  panY?: number;
};

/** Zoomgrenzen: 1 = ganz Deutschland, 14 ≈ Landkreis-/Lokationsebene. */
export const ZOOM_MIN = 0.75;
export const ZOOM_MAX = 14;

export const DEFAULT_CAMERA_3D: Camera3d = {
  yawDeg: 0,
  tiltDeg: 18,
  zoom: 1.08,
  panX: 0,
  panY: -0.13,
};

/** Mobil: fast Draufsicht, Norden oben, Neigung unter 20°. */
export const MOBILE_CAMERA_3D: Camera3d = {
  yawDeg: 0,
  tiltDeg: 16,
  zoom: 1,
  panX: 0,
  panY: 0,
};

export type ProjectionFit = "default" | "mobile";

export function camerasEqual3d(a: Camera3d, b: Camera3d): boolean {
  return (
    a.yawDeg === b.yawDeg &&
    a.tiltDeg === b.tiltDeg &&
    a.zoom === b.zoom &&
    (a.panX ?? 0) === (b.panX ?? 0) &&
    (a.panY ?? 0) === (b.panY ?? 0)
  );
}

export type Point2d = {
  x: number;
  y: number;
};

/** Ecken der DE-Bounding-Box in Ebenen-Koordinaten, inkl. Schleswig-Holstein. */
const DE_FIT_CORNERS: Point2d[] = [
  { x: -0.69, y: -0.93 },
  { x: 0.69, y: -0.93 },
  { x: -0.69, y: 0.93 },
  { x: 0.69, y: 0.93 },
  { x: 0, y: 0.93 },
  { x: 0, y: -0.93 },
  { x: -0.69, y: 0 },
  { x: 0.69, y: 0 },
];


export type ProjectedPoint3d = {
  x: number;
  y: number;
  depth: number;
  persp: number;
};

/** Rechnet (lng, lat) in normalisierte Ebene [-1, 1] um (y+ = Nord, x+ = Ost). */
export function geoToPlane(lng: number, lat: number): Point2d {
  return {
    x: ((lng - DE_CENTER_LNG) * DE_COS_LAT) / DE_HALF_SPAN,
    y: (lat - DE_CENTER_LAT) / DE_HALF_SPAN,
  };
}

/** 2D-Projektion für die Mobilkarte (SVG viewBox). */
export function projectGeoTo2d(
  lng: number,
  lat: number,
  width: number,
  height: number,
  padding = 24,
): Point2d {
  const { x, y } = geoToPlane(lng, lat);
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;
  // x spans roughly [-0.68, 0.69], y spans roughly [-0.92, 0.92]
  const scale = Math.min(usableW / 1.44, usableH / 1.9);
  return {
    x: width / 2 + x * scale,
    y: height / 2 - y * scale,
  };
}

export function polygonRingsToSvgPath2d(
  geometry: GeoJsonPolygonGeometry,
  width: number,
  height: number,
  padding = 24,
): string {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const parts: string[] = [];
  for (const poly of polygons) {
    for (const ring of poly) {
      if (ring.length < 3) continue;
      for (let i = 0; i < ring.length; i += 1) {
        const coord = ring[i]!;
        const p = projectGeoTo2d(coord[0]!, coord[1]!, width, height, padding);
        const cmd = i === 0 ? "M" : "L";
        parts.push(`${cmd}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      }
      parts.push("Z");
    }
  }
  return parts.join(" ");
}

export type ProjectionParams3d = {
  cosY: number;
  sinY: number;
  cosT: number;
  sinT: number;
  cx: number;
  cy: number;
  scale: number;
  cameraDist: number;
  panX: number;
  panY: number;
};

export function createProjectionParams3d(
  camera: Camera3d,
  width: number,
  height: number,
  fit: ProjectionFit = "default",
): ProjectionParams3d {
  const yawRad = (camera.yawDeg * Math.PI) / 180;
  const tiltRad = (camera.tiltDeg * Math.PI) / 180;
  const minDim = Math.min(width, height);
  const base: ProjectionParams3d = {
    cosY: Math.cos(yawRad),
    sinY: Math.sin(yawRad),
    cosT: Math.cos(tiltRad),
    sinT: Math.sin(tiltRad),
    cx: width * 0.5,
    cy: height * 0.56,
    scale: minDim * 0.47 * camera.zoom,
    cameraDist: 5.2,
    panX: camera.panX ?? 0,
    panY: camera.panY ?? 0,
  };
  if (fit !== "mobile") return base;

  // Deutschland in die Canvas einpassen (volle Breite, Schleswig-Holstein sichtbar).
  // Zoom und Pan bleiben getrennt: die Einpassung gilt für Zoom 1 ohne Verschiebung.
  const unit: ProjectionParams3d = {
    ...base,
    cx: width * 0.5,
    cy: height * 0.5,
    scale: 1,
    panX: 0,
    panY: 0,
  };
  const boundsOf = (params: ProjectionParams3d) => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const c of DE_FIT_CORNERS) {
      const p = projectPoint3d(c.x, c.y, 0, params);
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, maxX, minY, maxY };
  };
  const raw = boundsOf(unit);
  const padX = Math.max(8, width * 0.02);
  const padY = Math.max(12, height * 0.03);
  const scale0 = Math.min(
    (width - 2 * padX) / Math.max(1e-6, raw.maxX - raw.minX),
    (height - 2 * padY) / Math.max(1e-6, raw.maxY - raw.minY),
  );
  const sized: ProjectionParams3d = { ...unit, scale: scale0 };
  const box = boundsOf(sized);
  return {
    ...sized,
    scale: scale0 * camera.zoom,
    cx: sized.cx + width * 0.5 - (box.minX + box.maxX) / 2,
    // Überschüssige Höhe nach unten, damit unter der Kopfzahl wenig Leerraum bleibt.
    cy: sized.cy + padY - box.minY,
    panX: camera.panX ?? 0,
    panY: camera.panY ?? 0,
  };
}

/** Projiziert einen 3D-Punkt (x, y in Ebene, z = Höhe ≥ 0) in Canvas-Koordinaten. */
export function projectPoint3d(
  x: number,
  y: number,
  z: number,
  params: ProjectionParams3d,
): ProjectedPoint3d {
  const px = x - params.panX;
  const py = y - params.panY;
  const x1 = px * params.cosY - py * params.sinY;
  const y1 = px * params.sinY + py * params.cosY;
  const sy = y1 * params.cosT + z * params.sinT;
  const depth = -y1 * params.sinT + z * params.cosT;
  const denom = Math.max(0.8, params.cameraDist - depth);
  const persp = params.cameraDist / denom;
  return {
    x: params.cx + x1 * params.scale * persp,
    y: params.cy - sy * params.scale * persp,
    depth,
    persp,
  };
}

export function clampCamera3d(camera: Camera3d): Camera3d {
  let yaw = camera.yawDeg;
  while (yaw > 180) yaw -= 360;
  while (yaw < -180) yaw += 360;
  return {
    yawDeg: yaw,
    tiltDeg: Math.max(12, Math.min(76, camera.tiltDeg)),
    zoom: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, camera.zoom)),
    panX: Math.max(-1, Math.min(1, camera.panX ?? 0)),
    panY: Math.max(-1.1, Math.min(1.1, camera.panY ?? 0)),
  };
}

/** Umkehrung von projectPoint3d für z = 0: Canvas-Punkt → Ebenen-Punkt (null, wenn hinter dem Horizont). */
export function unprojectGround(sx: number, sy: number, params: ProjectionParams3d): Point2d | null {
  const u = (sx - params.cx) / params.scale;
  const v = (params.cy - sy) / params.scale;
  const d = params.cameraDist;
  const denom = params.cosT * d - v * params.sinT;
  if (Math.abs(denom) < 1e-6) return null;
  const y1 = (v * d) / denom;
  const persp = d / (d + y1 * params.sinT);
  if (!(persp > 0)) return null;
  const x1 = u / persp;
  return {
    x: x1 * params.cosY + y1 * params.sinY + params.panX,
    y: -x1 * params.sinY + y1 * params.cosY + params.panY,
  };
}

/** Zoomt um einen Canvas-Punkt: der Ebenen-Punkt unter dem Cursor bleibt stehen. */
export function zoomCameraAt(
  camera: Camera3d,
  factor: number,
  sx: number,
  sy: number,
  width: number,
  height: number,
  fit: ProjectionFit = "default",
): Camera3d {
  const next = clampCamera3d({ ...camera, zoom: camera.zoom * factor });
  const before = unprojectGround(sx, sy, createProjectionParams3d(camera, width, height, fit));
  const after = unprojectGround(sx, sy, createProjectionParams3d(next, width, height, fit));
  if (!before || !after) return next;
  return clampCamera3d({
    ...next,
    panX: (next.panX ?? 0) + (before.x - after.x),
    panY: (next.panY ?? 0) + (before.y - after.y),
  });
}

/** Verschiebt die Karte um einen Bildschirm-Versatz (Ziehen bei Zoom > 1). */
export function panCameraBy(
  camera: Camera3d,
  dxPx: number,
  dyPx: number,
  width: number,
  height: number,
  fit: ProjectionFit = "default",
): Camera3d {
  const params = createProjectionParams3d(camera, width, height, fit);
  const a = unprojectGround(params.cx, params.cy, params);
  const b = unprojectGround(params.cx - dxPx, params.cy - dyPx, params);
  if (!a || !b) return camera;
  return clampCamera3d({
    ...camera,
    panX: (camera.panX ?? 0) + (b.x - a.x),
    panY: (camera.panY ?? 0) + (b.y - a.y),
  });
}

/** 2D-Kreuzprodukt für Sichtbarkeitsprüfung (in Canvas mit Y nach unten: < 0 = dem Betrachter zugewandt). */
export function screenCross2d(p0: Point2d, p1: Point2d, p2: Point2d): number {
  return (p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x);
}

export type CuboidSideFace = {
  corners: [Point2d, Point2d, Point2d, Point2d];
  /** Relative Helligkeit [0..1] für konsistente Schattierung. */
  shade: number;
};

export type ProjectedCuboid = {
  baseCenter: ProjectedPoint3d;
  topCenter: ProjectedPoint3d;
  topFace: [Point2d, Point2d, Point2d, Point2d];
  visibleSides: CuboidSideFace[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

const SIDE_NORMALS: readonly [number, number][] = [
  [0, -1], // Süd
  [1, 0], // Ost
  [0, 1], // Nord
  [-1, 0], // West
];

/**
 * Erzeugt die projizierten Flächen eines 3D-Quaders (Deckel + 2 sichtbare Seitenflächen)
 * sowie die 2D-Bounding-Box fürs Hit-Testing.
 */
export function projectCuboid(
  x: number,
  y: number,
  halfWidth: number,
  height: number,
  params: ProjectionParams3d,
): ProjectedCuboid {
  const b0 = projectPoint3d(x - halfWidth, y - halfWidth, 0, params);
  const b1 = projectPoint3d(x + halfWidth, y - halfWidth, 0, params);
  const b2 = projectPoint3d(x + halfWidth, y + halfWidth, 0, params);
  const b3 = projectPoint3d(x - halfWidth, y + halfWidth, 0, params);

  const t0 = projectPoint3d(x - halfWidth, y - halfWidth, height, params);
  const t1 = projectPoint3d(x + halfWidth, y - halfWidth, height, params);
  const t2 = projectPoint3d(x + halfWidth, y + halfWidth, height, params);
  const t3 = projectPoint3d(x - halfWidth, y + halfWidth, height, params);

  const baseCenter = projectPoint3d(x, y, 0, params);
  const topCenter = projectPoint3d(x, y, height, params);

  const sideDefs: [Point2d, Point2d, Point2d, Point2d][] = [
    [b0, b1, t1, t0],
    [b1, b2, t2, t1],
    [b2, b3, t3, t2],
    [b3, b0, t0, t3],
  ];

  // Fixe Lichtquelle von vorne-links im Kameraraum
  const lightX = -0.68;
  const lightY = -0.73;

  const visibleSides: CuboidSideFace[] = [];
  for (let i = 0; i < 4; i += 1) {
    const corners = sideDefs[i]!;
    if (screenCross2d(corners[0], corners[1], corners[2]) < 0) {
      const [nx, ny] = SIDE_NORMALS[i]!;
      const rnx = nx * params.cosY - ny * params.sinY;
      const rny = nx * params.sinY + ny * params.cosY;
      const dot = rnx * lightX + rny * lightY;
      visibleSides.push({
        corners,
        shade: Math.max(0, Math.min(1, (dot + 1) * 0.5)),
      });
    }
  }

  const allPts = [b0, b1, b2, b3, t0, t1, t2, t3];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of allPts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    baseCenter,
    topCenter,
    topFace: [t0, t1, t2, t3],
    visibleSides,
    minX,
    maxX,
    minY,
    maxY,
  };
}
