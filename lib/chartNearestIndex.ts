export function nearestIndexFromFraction(fraction: number, count: number): number {
  if (count <= 0) {
    return 0;
  }
  const clamped = Math.min(1, Math.max(0, fraction));
  return Math.min(count - 1, Math.max(0, Math.round(clamped * (count - 1))));
}

export function nearestIndexFromClientX(
  clientX: number,
  rect: Pick<DOMRect, "left" | "width">,
  count: number,
  scrollLeft = 0,
): number {
  if (count <= 0 || rect.width <= 0) {
    return 0;
  }
  const x = clientX - rect.left + scrollLeft;
  const fraction = x / rect.width;
  return nearestIndexFromFraction(fraction, count);
}

export function chartIndexFromKey(
  key: string,
  current: number | null,
  count: number,
): number | null {
  if (count <= 0) {
    return null;
  }
  const start = current ?? Math.floor(count / 2);
  if (key === "ArrowRight") {
    return Math.min(count - 1, start + 1);
  }
  if (key === "ArrowLeft") {
    return Math.max(0, start - 1);
  }
  if (key === "Home") {
    return 0;
  }
  if (key === "End") {
    return count - 1;
  }
  return null;
}
