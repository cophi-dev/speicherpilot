/** SVG viewBox width → Achsenschrift (min. 11 mobil, 12 sonst). */
export function visionAxisFontSize(viewBoxWidth: number): number {
  return viewBoxWidth < 420 ? 11 : 12;
}

export function visionChartCompact(viewBoxWidth: number): boolean {
  return viewBoxWidth < 480;
}