/** Map a pointer position on the inner track (tick-to-tick) to a snapped front-point index. */
export function snapFrontIndex(clientX: number, trackStart: number, trackSpan: number, count: number): number {
  if (count <= 1) {
    return 0;
  }
  if (trackSpan <= 0) {
    return 0;
  }
  const t = (clientX - trackStart) / trackSpan;
  return Math.min(count - 1, Math.max(0, Math.round(t * (count - 1))));
}

export function frontIndexFromKey(key: string, current: number, count: number): number | null {
  if (count <= 0) {
    return null;
  }
  const last = count - 1;
  const page = Math.max(1, Math.round(count / 6));
  switch (key) {
    case "ArrowRight":
    case "ArrowUp":
      return Math.min(last, current + 1);
    case "ArrowLeft":
    case "ArrowDown":
      return Math.max(0, current - 1);
    case "Home":
      return 0;
    case "End":
      return last;
    case "PageUp":
      return Math.min(last, current + page);
    case "PageDown":
      return Math.max(0, current - page);
    default:
      return null;
  }
}
