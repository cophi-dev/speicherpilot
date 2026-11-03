import type { LiveDispatchPoint } from "@/lib/liveFleetDispatch";

export function capRingPoints<T extends LiveDispatchPoint>(points: T[], max = 96): T[] {
  if (points.length <= max) {
    return points;
  }
  const out: T[] = [];
  for (let i = 0; i < max; i++) {
    const idx = Math.min(points.length - 1, Math.round((i * (points.length - 1)) / (max - 1)));
    out.push(points[idx]);
  }
  return out;
}
