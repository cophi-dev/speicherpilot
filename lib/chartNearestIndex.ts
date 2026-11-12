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

/** Nächster Index zu einer ViewBox-X-Koordinate (nicht notwendig gleichmäßig). */
export function nearestIndexFromXs(viewBoxX: number, xs: readonly number[]): number {
  if (xs.length === 0) {
    return 0;
  }
  let best = 0;
  let bestD = Math.abs(xs[0]! - viewBoxX);
  for (let i = 1; i < xs.length; i += 1) {
    const d = Math.abs(xs[i]! - viewBoxX);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** clientX → ViewBox-X, wenn das Probe-Element dem viewBox-Raum 0…viewBoxWidth entspricht. */
export function viewBoxXFromClientX(
  clientX: number,
  rect: Pick<DOMRect, "left" | "width">,
  viewBoxWidth: number,
): number {
  if (rect.width <= 0) {
    return 0;
  }
  return ((clientX - rect.left) / rect.width) * viewBoxWidth;
}

export function nearestIndexFromClientXs(
  clientX: number,
  rect: Pick<DOMRect, "left" | "width">,
  viewBoxWidth: number,
  xs: readonly number[],
): number {
  return nearestIndexFromXs(viewBoxXFromClientX(clientX, rect, viewBoxWidth), xs);
}
