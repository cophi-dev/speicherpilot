export type NiceAxis = {
  min: number;
  max: number;
  step: number;
  ticks: number[];
};

/** Step of 1, 2 or 5 times a power of ten. */
export function niceStep(rough: number): number {
  if (!Number.isFinite(rough) || rough <= 0) {
    return 1;
  }
  const exponent = Math.floor(Math.log10(rough));
  const fraction = rough / 10 ** exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * 10 ** exponent;
}

function roundTo(value: number, step: number): number {
  const digits = step >= 1 ? 0 : Math.min(8, Math.ceil(-Math.log10(step)) + 1);
  return Number(value.toFixed(digits));
}

/** Snap a data range onto a 1/2/5 grid so axis labels stay readable. */
export function niceAxis(min: number, max: number, targetIntervals = 4): NiceAxis {
  let low = Number.isFinite(min) ? min : 0;
  let high = Number.isFinite(max) ? max : 1;
  if (low > high) {
    const swap = low;
    low = high;
    high = swap;
  }
  if (low === high) {
    const pad = low === 0 ? 1 : Math.abs(low) * 0.5;
    low -= pad;
    high += pad;
  }
  const intervals = Math.max(1, targetIntervals);
  const step = niceStep((high - low) / intervals);
  const niceMin = Math.floor(low / step) * step;
  const niceMax = Math.ceil(high / step) * step;
  const ticks: number[] = [];
  const count = Math.round((niceMax - niceMin) / step);
  for (let index = 0; index <= count; index += 1) {
    ticks.push(roundTo(niceMin + index * step, step));
  }
  return {
    min: ticks[0] ?? roundTo(niceMin, step),
    max: ticks[ticks.length - 1] ?? roundTo(niceMax, step),
    step,
    ticks,
  };
}

export type MirrorShareAxis = {
  max: number;
  ticks: number[];
  /** The 100% line is a gridline when that tick exists. It is never a limit. */
  lineAt100: "gridline" | "none";
};

/** Percent axis mirrored around zero. Tick labels are the absolute value, so there is no minus. */
export function mirrorShareAxis(values: number[]): MirrorShareAxis {
  const peak = values.reduce((highest, value) => (Number.isFinite(value) ? Math.max(highest, value) : highest), 0);
  const axis = niceAxis(0, Math.max(peak, 1));
  const hasHundred = axis.ticks.some((tick) => tick === 100);
  return {
    max: axis.max,
    ticks: axis.ticks,
    lineAt100: hasHundred ? "gridline" : "none",
  };
}
