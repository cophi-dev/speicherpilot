export type ChartLocale = "de" | "en";

/** HSL components live on `--token` (see globals.css), so alpha works: hsl(var(--c-load) / .35). */
export const cssVar = (name: string, alpha = 1) => `hsl(var(--${name}) / ${alpha})`;

export const series = {
  load: { stroke: cssVar("c-load"), strokeWidth: 1.5, fill: "none" },
  netLoad: { stroke: cssVar("c-load"), strokeWidth: 2.25, fill: "none" },
  pv: { stroke: cssVar("c-pv"), fill: cssVar("c-pv", 0.18), strokeWidth: 1.25 },
  discharge: { stroke: "none", fill: cssVar("c-bess", 0.85) },
  charge: { stroke: "none", fill: cssVar("c-bess", 0.35) },
  soc: { stroke: cssVar("c-bess"), strokeWidth: 1.5, strokeDasharray: "4 3", fill: "none" },
  import: { stroke: cssVar("c-grid"), fill: cssVar("c-grid", 0.25), strokeWidth: 1.25 },
  export: { stroke: cssVar("c-grid"), fill: cssVar("c-grid", 0.1), strokeWidth: 1.25, strokeDasharray: "2 2" },
  curtail: { stroke: "none", fill: "url(#hatch-curtail)" },
} as const;

export const common = {
  line: { dot: false, activeDot: { r: 3, strokeWidth: 0 }, isAnimationActive: false, connectNulls: false },
  area: { dot: false, isAnimationActive: false },
  bar: { isAnimationActive: false },
};

export const axis = {
  tick: { fontFamily: "var(--font-plex-mono)", fontSize: 12, fill: cssVar("subtle") },
  axisLine: false,
  tickLine: { stroke: cssVar("border-strong") },
  tickSize: 4,
};

export const grid = { stroke: cssVar("gridline"), vertical: false, strokeDasharray: "0" };

export function limitLine(kw: number, label: string) {
  return {
    y: kw,
    stroke: cssVar("c-limit"),
    strokeWidth: 1.5,
    strokeDasharray: "6 4",
    ifOverflow: "extendDomain" as const,
    label: {
      value: label,
      position: "insideTopRight" as const,
      fill: cssVar("c-limit"),
      fontFamily: "var(--font-plex-mono)",
      fontSize: 12,
    },
  };
}

export const tooltip = {
  cursor: { stroke: cssVar("border-strong"), strokeWidth: 1 },
  contentStyle: {
    background: cssVar("popover"),
    border: `1px solid ${cssVar("border")}`,
    borderRadius: 6,
    fontFamily: "var(--font-plex-mono)",
    fontSize: 12,
    padding: "8px 10px",
    boxShadow: "none",
  },
  labelStyle: { color: cssVar("muted-foreground"), marginBottom: 4 },
  itemStyle: { color: cssVar("foreground"), padding: 0 },
};

/**
 * Pixel x for the payback callout.
 * Prefer the right side of the break-even line, at least `gap` px past the y axis.
 * If that would run past the plot, shift left so the label stays inside.
 */
export function paybackLabelX(lineX: number, plotLeft: number, gap = 8, plotRight?: number, labelWidth = 0) {
  const preferred = Math.max(lineX, plotLeft) + gap;
  if (plotRight == null || labelWidth <= 0 || preferred + labelWidth <= plotRight) {
    return preferred;
  }
  return Math.max(plotLeft + gap, plotRight - labelWidth);
}

/** Extend the year axis only when a short pad lets the callout sit right of the break-even line. */
export function paybackDomainMax(maxYear: number, payback: number | null, innerWidth: number, labelWidthPx: number, maxExtraYears = 4) {
  if (payback == null || innerWidth <= labelWidthPx + 8) {
    return maxYear;
  }
  const needed = payback / (1 - labelWidthPx / innerWidth);
  if (!Number.isFinite(needed) || needed - maxYear > maxExtraYears) {
    return maxYear;
  }
  return Math.max(maxYear, needed);
}

export function fmtPower(kw: number, locale: ChartLocale = "de") {
  const absolute = Math.abs(kw);
  const sign = kw < 0 ? "−" : "";
  const tag = locale === "de" ? "de-DE" : "en-GB";
  const format = (value: number, digits = 0) =>
    new Intl.NumberFormat(tag, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
  if (absolute >= 1e6) {
    return `${sign}${format(absolute / 1e6, 1)}\u202FGW`;
  }
  if (absolute >= 1e4) {
    return `${sign}${format(absolute / 1e3, 1)}\u202FMW`;
  }
  return `${sign}${format(absolute, 0)}\u202FkW`;
}
