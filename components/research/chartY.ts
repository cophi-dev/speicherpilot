/** 0 (keine Senkung) oben, größere Senkung nach unten — wie in den Skizzen. */
export function yFromReduction(
  reductionGw: number,
  yMax: number,
  height: number,
  padTop = 26,
  padBottom = 44
): number {
  const inner = height - padTop - padBottom;
  const clamped = Math.max(0, Math.min(yMax, reductionGw));
  return padTop + (clamped / yMax) * inner;
}

export function reductionFromY(y: number, yMax: number, height: number, padTop = 26, padBottom = 44): number {
  const inner = height - padTop - padBottom;
  return Math.max(0, Math.min(yMax, ((y - padTop) / inner) * yMax));
}
