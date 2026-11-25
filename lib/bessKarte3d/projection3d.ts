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
};

export const DEFAULT_CAMERA_3D: Camera3d = {
  yawDeg: -14,
  tiltDeg: 48,
  zoom: 1,
};

export type Point2d = {
  x: number;
  y: number;
};

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
};

export function createProjectionParams3d(
  camera: Camera3d,
  width: number,
  height: number,
): ProjectionParams3d {
  const yawRad = (camera.yawDeg * Math.PI) / 180;
  const tiltRad = (camera.tiltDeg * Math.PI) / 180;
  const minDim = Math.min(width, height);
  return {
    cosY: Math.cos(yawRad),
    sinY: Math.sin(yawRad),
    cosT: Math.cos(tiltRad),
    sinT: Math.sin(tiltRad),
    cx: width * 0.5,
    cy: height * 0.56,
    scale: minDim * 0.43 * camera.zoom,
    cameraDist: 5.2,
  };
}

/** Projiziert einen 3D-Punkt (x, y in Ebene, z = Höhe ≥ 0) in Canvas-Koordinaten. */
export function projectPoint3d(
  x: number,
  y: number,
  z: number,
  params: ProjectionParams3d,
): ProjectedPoint3d {
  const x1 = x * params.cosY - y * params.sinY;
  const y1 = x * params.sinY + y * params.cosY;
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
    zoom: Math.max(0.75, Math.min(1.85, camera.zoom)),
  };
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
