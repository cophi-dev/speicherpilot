/** SVG viewBox width → Achsenschrift (min. 12 px). */
export function visionAxisFontSize(_viewBoxWidth?: number): number {
  return 12;
}

export function visionChartCompact(viewBoxWidth: number): boolean {
  return viewBoxWidth < 480;
}