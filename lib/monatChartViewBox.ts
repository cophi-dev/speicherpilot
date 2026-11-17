import { MONAT_WIDE_VIEWBOX_W } from "@/lib/monatSvgTypography";

export type MonatChartBox = { w: number; h: number; L: number; R: number; T: number; B: number };

const WIDE_HERO: MonatChartBox = { w: 1152, h: 460, L: 52, R: 188, T: 32, B: 62 };
const NARROW_HERO_BASE: MonatChartBox = { w: 350, h: 356, L: 38, R: 26, T: 24, B: 62 };

const WIDE_STUNDEN: MonatChartBox = { w: 1152, h: 400, L: 52, R: 24, T: 36, B: 48 };
const NARROW_STUNDEN_BASE: MonatChartBox = { w: 350, h: 334, L: 38, R: 10, T: 28, B: 58 };

function scaleBox(base: MonatChartBox, shellWidth: number): MonatChartBox {
  const scale = shellWidth / base.w;
  return {
    w: shellWidth,
    h: Math.round(base.h * scale),
    L: Math.round(base.L * scale),
    R: Math.round(base.R * scale),
    T: Math.round(base.T * scale),
    B: Math.round(base.B * scale),
  };
}

/** viewBox-Breite = Shell-Pixel (kein 350→1024-Skalieren). */
export function monatHeroChartBox(shellWidth: number): MonatChartBox {
  if (shellWidth >= MONAT_WIDE_VIEWBOX_W) {
    return WIDE_HERO;
  }
  return scaleBox(NARROW_HERO_BASE, Math.max(280, shellWidth));
}

export function monatStundenChartBox(shellWidth: number): MonatChartBox {
  if (shellWidth >= MONAT_WIDE_VIEWBOX_W) {
    return WIDE_STUNDEN;
  }
  return scaleBox(NARROW_STUNDEN_BASE, Math.max(280, shellWidth));
}

export function monatHeroUsesWideLayout(shellWidth: number): boolean {
  return shellWidth >= MONAT_WIDE_VIEWBOX_W;
}