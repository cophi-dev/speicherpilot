import { monatHeroBottomPadding } from "@/lib/monatFactorAxisLayout";
import { MONAT_WIDE_VIEWBOX_W } from "@/lib/monatSvgTypography";

export type MonatChartBox = { w: number; h: number; L: number; R: number; T: number; B: number };

const WIDE_HERO: MonatChartBox = { w: 1152, h: 460, L: 52, R: 188, T: 32, B: 62 };
const NARROW_HERO_BASE: MonatChartBox = { w: 350, h: 356, L: 54, R: 28, T: 24, B: 68 };

const WIDE_STUNDEN: MonatChartBox = { w: 1152, h: 400, L: 52, R: 24, T: 36, B: 48 };
const NARROW_STUNDEN_BASE: MonatChartBox = { w: 350, h: 334, L: 48, R: 10, T: 28, B: 58 };

/** Breite/Höhe wie Desktop-Wide (~0,4 × Breite), nicht volle 350→928-Höhenskalierung. */
const HERO_HEIGHT_RATIO = WIDE_HERO.h / WIDE_HERO.w;
const STUNDEN_HEIGHT_RATIO = WIDE_STUNDEN.h / WIDE_STUNDEN.w;
const NARROW_MIN_HERO_H = 300;
const NARROW_MIN_STUNDEN_H = 280;

function narrowBox(base: MonatChartBox, shellWidth: number, heightRatio: number, minH: number): MonatChartBox {
  const w = Math.max(280, shellWidth);
  const h = Math.max(minH, Math.round(w * heightRatio));
  const scale = w / base.w;
  return {
    w,
    h,
    L: Math.round(base.L * scale),
    R: Math.round(base.R * scale),
    T: Math.round(base.T * scale),
    B: monatHeroBottomPadding(56, Math.round(base.B * scale)),
  };
}

/** viewBox-Breite = Shell-Pixel (kein 350→1024-Skalieren). */
export function monatHeroChartBox(shellWidth: number): MonatChartBox {
  if (shellWidth >= MONAT_WIDE_VIEWBOX_W) {
    return WIDE_HERO;
  }
  const box = narrowBox(NARROW_HERO_BASE, shellWidth, HERO_HEIGHT_RATIO, NARROW_MIN_HERO_H);
  if (shellWidth >= 960 && shellWidth < MONAT_WIDE_VIEWBOX_W) {
    const T = 22;
    const B = 40;
    const L = 50;
    const R = Math.max(56, Math.min(80, Math.round(shellWidth * 0.07)));
    const h = Math.max(NARROW_MIN_HERO_H, Math.round(shellWidth * HERO_HEIGHT_RATIO));
    const plotH = h - T - B;
    return { w: shellWidth, h: T + plotH + B, L, R, T, B };
  }
  return box;
}

export function monatStundenChartBox(shellWidth: number): MonatChartBox {
  if (shellWidth >= MONAT_WIDE_VIEWBOX_W) {
    return WIDE_STUNDEN;
  }
  const box = narrowBox(NARROW_STUNDEN_BASE, shellWidth, STUNDEN_HEIGHT_RATIO, NARROW_MIN_STUNDEN_H);
  if (shellWidth >= 960 && shellWidth < MONAT_WIDE_VIEWBOX_W) {
    const plotH = box.h - box.T - box.B;
    const T = Math.max(22, box.T - 4);
    const B = 44;
    return { ...box, T, B, h: T + plotH + B };
  }
  return box;
}

export function monatHeroUsesWideLayout(shellWidth: number): boolean {
  return shellWidth >= MONAT_WIDE_VIEWBOX_W;
}

const WIDE_UEBERSCHUSS = { w: 1152, h: 384, poolW: 520 };
const NARROW_UEBERSCHUSS_POOL_W = 200;
const UEBERSCHUSS_START_Y = 48;
const UEBERSCHUSS_ROW_H_NARROW = 52;
const UEBERSCHUSS_COMPARE_ROWS = 2;
const UEBERSCHUSS_BOTTOM_PAD = 20;
const UEBERSCHUSS_BAR_H = 18;

/** Unterkante des SVG-Inhalts (Überschuss-Pool-Chart), ohne Leerfläche unten. */
export function monatUeberschussChartContentBottom(rowCount: number, wide: boolean): number {
  const rowH = wide ? 56 : UEBERSCHUSS_ROW_H_NARROW;
  const lastCompareY =
    UEBERSCHUSS_START_Y + rowCount * rowH + 44 + (UEBERSCHUSS_COMPARE_ROWS - 1) * (rowH - 8);
  return lastCompareY + UEBERSCHUSS_BAR_H + UEBERSCHUSS_BOTTOM_PAD;
}

const UEBERSCHUSS_RIGHT_GUTTER = 76;

export function monatUeberschussChartBox(
  shellWidth: number,
  rowCount: number,
): { w: number; h: number; poolW: number; rightGutter: number } {
  if (shellWidth >= MONAT_WIDE_VIEWBOX_W) {
    return { ...WIDE_UEBERSCHUSS, rightGutter: UEBERSCHUSS_RIGHT_GUTTER };
  }
  const w = Math.max(280, shellWidth);
  const scale = w / NARROW_HERO_BASE.w;
  const h = monatUeberschussChartContentBottom(rowCount, false);
  return {
    w: w + UEBERSCHUSS_RIGHT_GUTTER,
    h,
    poolW: Math.round(NARROW_UEBERSCHUSS_POOL_W * scale),
    rightGutter: UEBERSCHUSS_RIGHT_GUTTER,
  };
}