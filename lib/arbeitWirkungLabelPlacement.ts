import { formatQuantity } from "@/lib/formatQuantity";
import type { ArbeitWirkungModel } from "@/lib/monatKonzeptA";
import { arbeitPathCallouts, formatKonzeptPeakInstant } from "@/lib/monatKonzeptA";
import {
  axisTitleBoxes,
  logX,
  pathSegments,
  pointObstacles,
  poolLineSegment,
  plotHeight,
  xTickBoxes,
  yTickBoxes,
  yWirkung,
  zeroLineSegment,
  CHART_PAD_L,
  CHART_PAD_R,
  CHART_PAD_T,
  CHART_VIEW_H,
  type Box,
  type Segment,
} from "@/lib/arbeitWirkungChartGeometry";

export type LabelLine = { text: string; fontSize: number; bold?: boolean };
export type PlacementDir = "N" | "S" | "E" | "W" | "NE" | "NW" | "SE" | "SW";

export type LabelSpec = {
  id: string;
  anchorX: number;
  anchorY: number;
  lines: LabelLine[];
  priority: number;
  /** bevorzugte Richtungen zuerst */
  prefer?: PlacementDir[];
};

export type PlacedLabel = LabelSpec & {
  dir: PlacementDir;
  x: number;
  y: number;
  box: Box;
  textAnchor: "start" | "middle" | "end";
  dominantBaseline: "auto" | "hanging" | "ideographic";
};

const DIRS: PlacementDir[] = ["N", "NE", "NW", "E", "W", "SE", "SW", "S"];

const DIR_OFFSET: Record<PlacementDir, { dx: number; dy: number; textAnchor: PlacedLabel["textAnchor"]; baseline: PlacedLabel["dominantBaseline"] }> =
  {
    N: { dx: 0, dy: -18, textAnchor: "middle", baseline: "auto" },
    S: { dx: 0, dy: 20, textAnchor: "middle", baseline: "hanging" },
    E: { dx: 18, dy: 0, textAnchor: "start", baseline: "auto" },
    W: { dx: -18, dy: 0, textAnchor: "end", baseline: "auto" },
    NE: { dx: 16, dy: -16, textAnchor: "start", baseline: "auto" },
    NW: { dx: -16, dy: -16, textAnchor: "end", baseline: "auto" },
    SE: { dx: 16, dy: 20, textAnchor: "start", baseline: "hanging" },
    SW: { dx: -16, dy: 20, textAnchor: "end", baseline: "hanging" },
  };

function lineWidth(text: string, fontSize: number, bold?: boolean): number {
  const per = fontSize * (bold ? 0.66 : 0.6);
  return text.length * per * 1.08;
}

export function labelTextBox(lines: LabelLine[]): { w: number; h: number; lineHeights: number[] } {
  const lineHeights = lines.map((l) => l.fontSize * 1.35);
  const w = Math.max(...lines.map((l) => lineWidth(l.text, l.fontSize, l.bold)));
  const h = lineHeights.reduce((a, b) => a + b, 0);
  return { w, h, lineHeights };
}

function boxFromAnchor(
  anchorX: number,
  anchorY: number,
  dir: PlacementDir,
  textW: number,
  textH: number,
  scale = 1,
): { x: number; y: number; textAnchor: PlacedLabel["textAnchor"]; dominantBaseline: PlacedLabel["dominantBaseline"] } {
  const { dx, dy, textAnchor, baseline } = DIR_OFFSET[dir];
  const ax = anchorX + dx * scale;
  const ay = anchorY + dy * scale;
  let x = ax;
  let y = ay;
  if (textAnchor === "middle") x = ax - textW / 2;
  else if (textAnchor === "end") x = ax - textW;
  if (baseline === "hanging") y = ay;
  else y = ay - textH;
  return { x, y, textAnchor, dominantBaseline: baseline };
}

export function expandBox(box: Box, pad: number): Box {
  return { x: box.x - pad, y: box.y - pad, w: box.w + 2 * pad, h: box.h + 2 * pad };
}

export function boxesOverlap(a: Box, b: Box, pad = 2): boolean {
  const A = expandBox(a, pad);
  const B = expandBox(b, pad);
  return A.x < B.x + B.w && A.x + A.w > B.x && A.y < B.y + B.h && A.y + A.h > B.y;
}

function pointToSegmentDist(px: number, py: number, seg: Segment): number {
  const { x1, y1, x2, y2 } = seg;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx;
  const qy = y1 + t * dy;
  return Math.hypot(px - qx, py - qy);
}

export function boxNearSegment(box: Box, seg: Segment, threshold: number): boolean {
  const corners = [
    [box.x, box.y],
    [box.x + box.w, box.y],
    [box.x, box.y + box.h],
    [box.x + box.w, box.y + box.h],
    [box.x + box.w / 2, box.y + box.h / 2],
  ];
  for (const [px, py] of corners) {
    if (pointToSegmentDist(px, py, seg) <= threshold) return true;
  }
  return false;
}

export function segmentIntersectsBox(seg: Segment, box: Box, pad = 2): boolean {
  return boxNearSegment(expandBox(box, pad), seg, 1.25);
}

type Obstacle =
  | { kind: "box"; box: Box }
  | { kind: "segment"; segment: Segment; threshold?: number };

function conflicts(box: Box, obstacles: Obstacle[], pad = 3): boolean {
  for (const o of obstacles) {
    if (o.kind === "box" && boxesOverlap(box, o.box, pad)) return true;
    if (o.kind === "segment") {
      const th = o.threshold ?? 3;
      if (boxNearSegment(expandBox(box, pad), o.segment, th)) return true;
    }
  }
  return false;
}

export function placeLabels(specs: LabelSpec[], obstacles: Obstacle[], viewW: number): PlacedLabel[] {
  const sorted = [...specs].sort((a, b) => a.priority - b.priority);
  const obs = [...obstacles];
  const placed: PlacedLabel[] = [];

  for (const spec of sorted) {
    const { w, h } = labelTextBox(spec.lines);
    const tryDirs = [...(spec.prefer ?? []), ...DIRS.filter((d) => !spec.prefer?.includes(d))];
    let chosen: PlacedLabel | null = null;
    outer: for (const scale of [1, 1.45, 2.1, 2.8, 3.6]) {
      for (const dir of tryDirs) {
        const pos = boxFromAnchor(spec.anchorX, spec.anchorY, dir, w, h, scale);
        const box: Box = { x: pos.x, y: pos.y, w, h };
        const inView =
          box.x >= 4 &&
          box.y >= 4 &&
          box.x + box.w <= viewW - 4 &&
          box.y + box.h <= CHART_VIEW_H - 2;
        if (!inView) continue;
        if (!conflicts(box, obs)) {
          chosen = {
            ...spec,
            dir,
            x: pos.x,
            y: pos.y,
            box,
            textAnchor: pos.textAnchor,
            dominantBaseline: pos.dominantBaseline,
          };
          obs.push({
          kind: "box",
          box: { x: box.x - 4, y: box.y - 2, w: box.w + 8, h: box.h + 4 },
        });
          break outer;
        }
      }
    }
    if (!chosen) {
      const dir = spec.prefer?.[0] ?? "N";
      const pos = boxFromAnchor(spec.anchorX, spec.anchorY, dir, w, h);
      chosen = {
        ...spec,
        dir,
        x: pos.x,
        y: pos.y,
        box: { x: pos.x, y: pos.y, w, h },
        textAnchor: pos.textAnchor,
        dominantBaseline: pos.dominantBaseline,
      };
      obs.push({ kind: "box", box: chosen.box });
    }
    placed.push(chosen);
  }
  return placed;
}

export function buildChartObstacles(model: ArbeitWirkungModel, viewW: number, strategies: readonly string[]): Obstacle[] {
  const obs: Obstacle[] = [];
  for (const b of yTickBoxes(viewW)) obs.push({ kind: "box", box: b });
  for (const b of xTickBoxes(viewW)) obs.push({ kind: "box", box: b });
  for (const b of axisTitleBoxes(viewW)) obs.push({ kind: "box", box: b });
  for (const b of pointObstacles(model, strategies as never, viewW)) obs.push({ kind: "box", box: b });
  for (const strategy of strategies) {
    for (const p of model.points.filter((pt) => pt.strategy === strategy)) {
      const cx = logX(p.chargeGwh, viewW);
      const cy = yWirkung(p.wirkungGw);
      obs.push({ kind: "box", box: { x: cx - 18, y: cy - 28, w: 36, h: 14 } });
    }
  }
  for (const seg of pathSegments(model, strategies as never, viewW)) obs.push({ kind: "segment", segment: seg, threshold: 4 });
  obs.push({ kind: "segment", segment: zeroLineSegment(viewW), threshold: 2 });
  obs.push({ kind: "segment", segment: poolLineSegment(logX(model.surplusPoolGwh, viewW)), threshold: 2 });
  return obs;
}

export function arbeitWirkungLabelSpecs(
  model: ArbeitWirkungModel,
  viewW: number,
  marktX10Detail: { residualGw: number; chargeGw: number; priceEurMwh: number } | null,
): LabelSpec[] {
  const pathLabels = arbeitPathCallouts(model);
  const spitze10 = model.points.find((p) => p.strategy === "spitze" && p.factor === 10)!;
  const ue10 = model.points.find((p) => p.strategy === "ueberschuss" && p.factor === 10)!;
  const markt1 = model.points.find((p) => p.strategy === "markt" && p.factor === 1)!;
  const marktX10 = model.marktX10;
  const poolX = logX(model.surplusPoolGwh, viewW);
  const yZero = yWirkung(0);

  const specs: LabelSpec[] = [
    {
      id: "arbeit-label-pool",
      anchorX: poolX - 8,
      anchorY: CHART_PAD_T + 28,
      lines: [
        { text: `Überschuss-Pool ${formatQuantity(model.surplusPoolGwh, "de", 1)} GWh`, fontSize: 12 },
        { text: "mehr Überschuss gab es nicht", fontSize: 12 },
      ],
      priority: 3,
      prefer: ["W", "NW", "SW"],
    },
    {
      id: "arbeit-label-spitze",
      anchorX: logX(spitze10.chargeGwh, viewW),
      anchorY: yWirkung(spitze10.wirkungGw),
      lines: [{ text: pathLabels.spitze, fontSize: 12, bold: true }],
      priority: 1,
      prefer: ["N", "NW", "NE", "W"],
    },
    {
      id: "arbeit-label-ueberschuss",
      anchorX: logX(ue10.chargeGwh, viewW) - 16,
      anchorY: yWirkung(ue10.wirkungGw) + 4,
      lines: [
        { text: "Differenz aufnehmen ·", fontSize: 12, bold: true },
        { text: "stößt bei ×10 an den Pool", fontSize: 12, bold: true },
      ],
      priority: 7,
      prefer: ["W", "NW", "SW", "N"],
    },
    {
      id: "arbeit-label-markt",
      anchorX: logX(markt1.chargeGwh, viewW),
      anchorY: yWirkung(markt1.wirkungGw),
      lines: [
        { text: "Marktorientiert ×1:", fontSize: 12, bold: true },
        { text: pathLabels.markt.replace(/^Marktorientiert ×1:\s*/, ""), fontSize: 12, bold: true },
      ],
      priority: 8,
      prefer: ["N", "NW", "NE", "W"],
    },
    {
      id: "arbeit-ref-label",
      anchorX: viewW - CHART_PAD_R - 4,
      anchorY: yZero - 6,
      lines: [
        {
          text: `Referenz ohne Speicher ${formatQuantity(model.refPeakGw, "de", 2)} GW · ${formatKonzeptPeakInstant(model.refPeakTs) ?? "—"}`,
          fontSize: 12,
        },
      ],
      priority: 4,
      prefer: ["N", "NE", "NW", "S"],
    },
  ];

  if (marktX10 && marktX10Detail) {
    specs.push({
      id: "arbeit-markt-callout",
      anchorX: logX(marktX10.chargeGwh, viewW) - 28,
      anchorY: yWirkung(marktX10.wirkungGw) - 12,
      lines: [
        { text: `${formatQuantity(marktX10.peakAfterGw, "de", 2)} GW`, fontSize: 26, bold: true },
        {
          text: `neue Monatsspitze · ${marktX10.peakTs?.slice(0, 10) ?? ""}`,
          fontSize: 12,
        },
        {
          text: `${formatQuantity(marktX10Detail.residualGw, "de", 2)} GW Restlast + ${formatQuantity(marktX10Detail.chargeGw, "de", 2)} GW Laden · ${formatQuantity(marktX10Detail.priceEurMwh, "de", 2)} €/MWh`,
          fontSize: 12,
        },
      ],
      priority: 0,
      prefer: ["W", "NW", "SW", "N"],
    });
  }

  return specs;
}

export function buildArbeitWirkungLabels(
  model: ArbeitWirkungModel,
  viewW: number,
  marktX10Detail: { residualGw: number; chargeGw: number; priceEurMwh: number } | null,
  extraObstacles: Obstacle[] = [],
): PlacedLabel[] {
  const specs = arbeitWirkungLabelSpecs(model, viewW, marktX10Detail);
  const obstacles = [...buildChartObstacles(model, viewW, ["spitze", "ueberschuss", "markt"]), ...extraObstacles];
  return placeLabels(specs, obstacles, viewW);
}
