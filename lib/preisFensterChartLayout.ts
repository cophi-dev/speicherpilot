import { LUECKE_DESKTOP, LUECKE_MOBILE_PAD } from "@/lib/lueckeChartGeometry";

/** Platz für dreistellige Y-Ticks (z. B. „400“) bei textAnchor end. */
export const PREIS_Y_LABEL_PAD_LEFT = 50;

export function preisChartPadLeft(params: {
  shellWidth: number;
  wideFrame: boolean;
  compact: boolean;
}): number {
  const base = params.compact ? LUECKE_MOBILE_PAD.left : LUECKE_DESKTOP.pad.left;
  if (params.wideFrame) {
    return base;
  }
  const scaled = Math.round(base * (params.shellWidth / LUECKE_DESKTOP.w));
  return Math.max(PREIS_Y_LABEL_PAD_LEFT, scaled);
}

/** Y-Tick „0“ am Ursprung kollidiert mit X-„00“ — nicht zeichnen. */
export function preisYAxisTicksVisible(ticks: number[]): number[] {
  return ticks.filter((tick) => tick !== 0);
}

export function preisHourLabelPlacement(
  hour: number,
  x: number,
  padL: number,
): { x: number; textAnchor: "middle" | "start" | "end" } {
  if (hour === 0) {
    return { x: padL + 6, textAnchor: "start" };
  }
  if (hour >= 24) {
    return { x: x - 2, textAnchor: "end" };
  }
  return { x, textAnchor: "middle" };
}

/** Grobe linke Kante des Y-Labels (textAnchor end) für Clipping-Checks. */
export function preisYTickLabelLeftEdge(padL: number, fontSizePx = 12): number {
  const maxLabelWidth = fontSizePx * 2.6;
  return padL - 8 - maxLabelWidth;
}