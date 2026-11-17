const TICK_LABEL_DY = 4;
const ABOVE_REF_LABEL_DY = -8;

function tickLabelY(lineY: number): number {
  return lineY + TICK_LABEL_DY;
}

/** Y-Ticks weglassen + Referenz-„64,4“-Y: mindestens 4 px zu jedem Tick-Label. */
export function layoutMonatHeroYAxis(
  ticks: number[],
  tickLineY: (gw: number) => number,
  refLineY: number,
  fontSize = 14,
  minGapPx = 4,
): { ticks: number[]; refPeakLabelY: number } {
  const minDist = fontSize + minGapPx;
  const below = tickLabelY(refLineY);
  const above = refLineY + ABOVE_REF_LABEL_DY;
  const refPeakLabelY = ticks.every((t) => Math.abs(tickLabelY(tickLineY(t)) - below) >= minDist) ? below : above;
  const filtered = ticks.filter((t) => Math.abs(tickLabelY(tickLineY(t)) - refPeakLabelY) >= minDist);
  return { ticks: filtered, refPeakLabelY };
}