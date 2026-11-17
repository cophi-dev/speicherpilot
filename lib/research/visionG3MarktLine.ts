/** Vertikale Markt-Linie endet oberhalb der %-Beschriftung im Balken. */
export function visionG3MarktLineY(rowY: number, rowH: number, fontSize: number): { y1: number; y2: number } {
  const labelBand = Math.max(14, fontSize + 6);
  return {
    y1: rowY + 4,
    y2: rowY + rowH / 2 - labelBand / 2,
  };
}