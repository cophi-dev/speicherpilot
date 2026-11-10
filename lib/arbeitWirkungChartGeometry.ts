import type { ArbeitWirkungModel, ArbeitWirkungPoint } from "@/lib/monatKonzeptA";
import {
  NATIONAL_FLEET_FACTORS,
  type NationalFleetFactor,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";

export const CHART_VIEW_H = 520;
export const CHART_PAD_L = 92;
export const CHART_PAD_R = 24;
export const CHART_PAD_T = 48;
export const CHART_PAD_B = 40;
export const CHART_Y_MIN = -35;
export const CHART_Y_MAX = 16;

export type Box = { x: number; y: number; w: number; h: number };
export type Segment = { x1: number; y1: number; x2: number; y2: number };

export function plotWidth(viewW: number): number {
  return viewW - CHART_PAD_L - CHART_PAD_R;
}

export function plotHeight(): number {
  return CHART_VIEW_H - CHART_PAD_T - CHART_PAD_B;
}

export function logX(chargeGwh: number, viewW: number): number {
  const plotW = plotWidth(viewW);
  const minL = Math.log10(10);
  const maxL = Math.log10(10000);
  const v = Math.max(10, chargeGwh);
  const log = Math.log10(v);
  return CHART_PAD_L + ((log - minL) / (maxL - minL)) * plotW;
}

export function yWirkung(gw: number): number {
  const plotH = plotHeight();
  return CHART_PAD_T + plotH - ((gw - CHART_Y_MIN) / (CHART_Y_MAX - CHART_Y_MIN)) * plotH;
}

export function plotFrameBox(viewW: number): Box {
  const plotW = plotWidth(viewW);
  const plotH = plotHeight();
  return { x: CHART_PAD_L, y: CHART_PAD_T, w: plotW, h: plotH };
}

export function pointsForStrategy(
  model: ArbeitWirkungModel,
  strategy: NationalFleetStrategyUi,
): ArbeitWirkungPoint[] {
  return NATIONAL_FLEET_FACTORS.map(
    (f) => model.points.find((p) => p.strategy === strategy && p.factor === f)!,
  );
}

export function pathSegments(model: ArbeitWirkungModel, strategies: NationalFleetStrategyUi[], viewW: number): Segment[] {
  const out: Segment[] = [];
  for (const strategy of strategies) {
    const pts = pointsForStrategy(model, strategy);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      out.push({
        x1: logX(a.chargeGwh, viewW),
        y1: yWirkung(a.wirkungGw),
        x2: logX(b.chargeGwh, viewW),
        y2: yWirkung(b.wirkungGw),
      });
    }
  }
  return out;
}

export function pointObstacles(
  model: ArbeitWirkungModel,
  strategies: NationalFleetStrategyUi[],
  viewW: number,
  radiusPad = 10,
): Box[] {
  const r = 7 + radiusPad;
  const boxes: Box[] = [];
  for (const strategy of strategies) {
    for (const p of pointsForStrategy(model, strategy)) {
      const cx = logX(p.chargeGwh, viewW);
      const cy = yWirkung(p.wirkungGw);
      boxes.push({ x: cx - r, y: cy - r, w: 2 * r, h: 2 * r });
    }
  }
  return boxes;
}

const Y_TICKS = [-30, -20, -10, 0, 5, 10, 15] as const;
const X_TICKS = [10, 100, 1000, 10000] as const;

export function yTickBoxes(viewW: number): Box[] {
  return Y_TICKS.map((tick) => {
    const cy = yWirkung(tick);
    return { x: CHART_PAD_L - 48, y: cy - 9, w: 42, h: 16 };
  });
}

export function xTickBoxes(viewW: number): Box[] {
  return X_TICKS.map((tick) => {
    const cx = logX(tick, viewW);
    return { x: cx - 28, y: CHART_VIEW_H - 44, w: 56, h: 16 };
  });
}

export function axisTitleBoxes(viewW: number): Box[] {
  const plotW = plotWidth(viewW);
  return [
    { x: CHART_PAD_L, y: CHART_VIEW_H - 18, w: plotW, h: 14 },
    { x: 18, y: CHART_PAD_T - 22, w: 160, h: 16 },
    { x: 18, y: CHART_PAD_T + plotHeight() + 12, w: 120, h: 16 },
  ];
}

export function zeroLineSegment(viewW: number): Segment {
  const y = yWirkung(0);
  return { x1: CHART_PAD_L, y1: y, x2: viewW - CHART_PAD_R, y2: y };
}

export function poolLineSegment(poolX: number): Segment {
  const plotH = plotHeight();
  return { x1: poolX, y1: CHART_PAD_T, x2: poolX, y2: CHART_PAD_T + plotH };
}

export type PointRef = { strategy: NationalFleetStrategyUi; factor: NationalFleetFactor };
