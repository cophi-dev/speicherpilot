/** Wide Monat charts (viewBox width). */
export const MONAT_WIDE_VIEWBOX_W = 1152;

/** Narrow Monat charts (viewBox width). */
export const MONAT_NARROW_VIEWBOX_W = 350;

const PAGE_MAX_PX = 1248;

export function monatPageContentWidth(viewportPx: number): number {
  const gutter = viewportPx >= 768 ? 48 : 20;
  return Math.min(viewportPx, PAGE_MAX_PX) - 2 * gutter;
}

export function monatChartUsesWideLayout(containerWidth: number): boolean {
  return containerWidth >= MONAT_WIDE_VIEWBOX_W;
}

/** Geschätzte gerenderte Schriftgröße (px), SVG width 100 % des Containers. */
export function monatRenderedFontPx(viewBoxFont: number, viewportPx: number): number {
  const container = monatPageContentWidth(viewportPx);
  const wide = monatChartUsesWideLayout(container);
  const vbW = wide ? MONAT_WIDE_VIEWBOX_W : Math.max(MONAT_NARROW_VIEWBOX_W, container);
  return viewBoxFont * (container / vbW);
}

/** viewBox-fontSize so rendered size is at least targetPx (Gutter-viewBox mitbrechnen). */
export function monatViewBoxFontSize(targetRenderedPx: number, renderedWidthPx: number, viewBoxW: number): number {
  const w = Math.max(1, renderedWidthPx);
  return (targetRenderedPx * viewBoxW) / w;
}