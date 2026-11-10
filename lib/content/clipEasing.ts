export function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

export function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - (1 - x) ** 3;
}

export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

export function samplePiecewise(secs: number, knots: Array<{ t: number; v: number }>): number {
  if (knots.length === 0) return 0;
  if (secs <= knots[0]!.t) return knots[0]!.v;
  for (let i = 1; i < knots.length; i += 1) {
    const a = knots[i - 1]!;
    const b = knots[i]!;
    if (secs <= b.t) {
      const u = (secs - a.t) / Math.max(1e-9, b.t - a.t);
      return a.v + (b.v - a.v) * easeInOutCubic(u);
    }
  }
  return knots[knots.length - 1]!.v;
}
