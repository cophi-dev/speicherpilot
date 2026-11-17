import { visionChartCompact } from "@/lib/research/visionChartMetrics";

const NBSP = "\u00a0";

export function visionG3TitleLayout(width: number): {
  compact: boolean;
  extraTopPad: number;
} {
  return { compact: visionChartCompact(width), extraTopPad: visionChartCompact(width) ? 18 : 0 };
}

export function visionG3AxisTitleY(
  compact: boolean,
  ueberschussGwhFormatted: string,
): { y1: number; line1: string; line2: string } {
  const line1 = "Anteil am nationalen Überschuss";
  const line2 = `${ueberschussGwhFormatted}${NBSP}GWh [%]`;
  const y1 = compact ? 18 : 22;
  return { y1, line1, line2 };
}