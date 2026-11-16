import { LUECKE_DESKTOP, LUECKE_MOBILE_PAD } from "@/lib/lueckeChartGeometry";

export type TextAnchor = "start" | "middle" | "end";

export function liveTagPreisPanelLayout(compact: boolean, shellWidth: number) {
  const frame = compact
    ? { w: Math.max(320, shellWidth), h: 220, pad: LUECKE_MOBILE_PAD }
    : { w: LUECKE_DESKTOP.w, h: 220, pad: { ...LUECKE_DESKTOP.pad, right: 52 } };
  const padL = frame.pad.left;
  const padR = frame.pad.right;
  const padT = compact ? 36 : 40;
  const padB = compact ? 28 : 32;
  return {
    frame,
    padL,
    padR,
    padT,
    padB,
    plotW: frame.w - padL - padR,
    plotH: frame.h - padT - padB,
  };
}

/** Achsen-Unit-Labels: innerhalb des viewBox (€/MWh links, GW rechts). */
export function preisPanelUnitLabelPositions(frameW: number, padL: number, padR: number) {
  return {
    eurPerMwh: { x: padL, textAnchor: "start" as const },
    gw: { x: frameW - padR, textAnchor: "end" as const },
  };
}

export function priceAxisValues(priceMin: number, priceMax: number): [number, number, number] {
  const mid = Math.round((priceMin + priceMax) / 2);
  return [Math.round(priceMin), mid, Math.round(priceMax)];
}

export function gwAxisValues(maxGw: number): [number, number, number] {
  const top = Math.round(maxGw * 10) / 10;
  return [-top, 0, top];
}

const CHAR_WIDTH_EM = 0.58;

export function estimateTextSpan(
  text: string,
  x: number,
  fontSize: number,
  textAnchor: TextAnchor,
): { left: number; right: number } {
  const width = text.length * fontSize * CHAR_WIDTH_EM;
  if (textAnchor === "start") {
    return { left: x, right: x + width };
  }
  if (textAnchor === "end") {
    return { left: x - width, right: x };
  }
  const half = width / 2;
  return { left: x - half, right: x + half };
}

export function axisTickLabelX(
  side: "price" | "gw",
  frameW: number,
  padL: number,
  padR: number,
  compact: boolean,
): { x: number; textAnchor: TextAnchor } {
  if (side === "price") {
    return { x: padL - (compact ? 3 : 6), textAnchor: "end" };
  }
  if (compact) {
    return { x: frameW - padR, textAnchor: "end" };
  }
  return { x: frameW - padR + 6, textAnchor: "start" };
}

export function labelsWithinViewBox(
  frameW: number,
  entries: { text: string; x: number; fontSize: number; textAnchor: TextAnchor }[],
  margin = 0,
): boolean {
  return entries.every((entry) => {
    const { left, right } = estimateTextSpan(entry.text, entry.x, entry.fontSize, entry.textAnchor);
    return left >= margin && right <= frameW - margin;
  });
}