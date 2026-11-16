/** Wide Monat charts (viewBox width). */
export const MONAT_WIDE_VIEWBOX_W = 1152;

/** Narrow Monat charts (viewBox width). */
export const MONAT_NARROW_VIEWBOX_W = 350;

const PAGE_MAX_PX = 1248;

export function monatPageContentWidth(viewportPx: number): number {
  const gutter = viewportPx >= 768 ? 48 : 20;
  return Math.min(viewportPx, PAGE_MAX_PX) - 2 * gutter;
}

/** SVG-Breite im Wide-Layout: mindestens viewBox, kein Downscale unter 1:1. */
export function monatWideSvgCssWidth(viewportPx: number): number {
  return Math.max(MONAT_WIDE_VIEWBOX_W, monatPageContentWidth(viewportPx));
}

export function monatNarrowSvgCssWidth(viewportPx: number): number {
  return Math.max(MONAT_NARROW_VIEWBOX_W, monatPageContentWidth(viewportPx));
}

/** Geschätzte gerenderte Schriftgröße (px) bei festem SVG-CSS-Breite. */
export function monatRenderedFontPx(viewBoxFont: number, viewportPx: number, wide: boolean): number {
  const vbW = wide ? MONAT_WIDE_VIEWBOX_W : MONAT_NARROW_VIEWBOX_W;
  const svgW = wide ? monatWideSvgCssWidth(viewportPx) : monatNarrowSvgCssWidth(viewportPx);
  return viewBoxFont * (svgW / vbW);
}