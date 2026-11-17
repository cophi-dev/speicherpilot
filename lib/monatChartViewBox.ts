import { monatHeroBottomPadding } from "@/lib/monatFactorAxisLayout";
import { MONAT_WIDE_VIEWBOX_W } from "@/lib/monatSvgTypography";

export type MonatChartBox = { w: number; h: number; L: number; R: number; T: number; B: number };

const WIDE_HERO: MonatChartBox = { w: 1152, h: 460, L: 52, R: 188, T: 32, B: 62 };
const NARROW_HERO_BASE: MonatChartBox = { w: 350, h: 356, L: 38, R: 26, T: 24, B: 62 };

const WIDE_STUNDEN: MonatChartBox = { w: 1152, h: 400, L: 52, R: 24, T: 36, B: 48 };
const NARROW_STUNDEN_BASE: MonatChartBox = { w: 350, h: 334, L: 38, R: 10, T: 28, B: 58 };

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
  return narrowBox(NARROW_HERO_BASE, shellWidth, HERO_HEIGHT_RATIO, NARROW_MIN_HERO_H);
}

export function monatStundenChartBox(shellWidth: number): MonatChartBox {
  if (shellWidth >= MONAT_WIDE_VIEWBOX_W) {
    return WIDE_STUNDEN;
  }
  return narrowBox(NARROW_STUNDEN_BASE, shellWidth, STUNDEN_HEIGHT_RATIO, NARROW_MIN_STUNDEN_H);
}

export function monatHeroUsesWideLayout(shellWidth: number): boolean {
  return shellWidth >= MONAT_WIDE_VIEWBOX_W;
}