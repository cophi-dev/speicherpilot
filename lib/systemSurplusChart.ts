import { niceAxis } from "@/lib/niceTicks";

export type SurplusBarInput = {
  dateBerlin: string;
  surplusGwh: number;
  absorbedGwh: number;
};

export type XLabelAnchor = "start" | "middle" | "end";

export type LaidOutSurplusBar = {
  dateBerlin: string;
  surplusGwh: number;
  absorbedGwh: number;
  /** Height uses this cap so a bar never paints above the day's surplus. */
  absorbedDrawnGwh: number;
  x: number;
  width: number;
  surplusY: number;
  surplusH: number;
  absorbedY: number;
  absorbedH: number;
  label: string | null;
  labelX: number | null;
  labelAnchor: XLabelAnchor | null;
};

export type SurplusChartLayout = {
  width: number;
  height: number;
  plotLeft: number;
  plotRight: number;
  plotTop: number;
  plotBottom: number;
  /** Y labels end this many px left of the plot. Grid lines start at plotLeft. */
  yLabelGap: number;
  yLabelX: number;
  gridX1: number;
  gridX2: number;
  yMax: number;
  ticks: Array<{ value: number; y: number }>;
  bars: LaidOutSurplusBar[];
};

const HEIGHT_PAD = 4;
/** Fits a two-digit GW label at 12 px. */
const Y_LABEL_COLUMN = 24;
export const Y_LABEL_GAP = 8;

export function formatChartDay(dateBerlin: string): string {
  const parts = dateBerlin.split("-");
  const day = Number(parts[2]);
  const month = Number(parts[1]);
  if (!Number.isFinite(day) || !Number.isFinite(month)) {
    return dateBerlin;
  }
  return `${day}.${month}.`;
}

/** One label per week, counted from the first day. No extra label on the final day. */
export function weekLabelIndexes(count: number): number[] {
  const indexes: number[] = [];
  for (let index = 0; index < count; index += 7) {
    indexes.push(index);
  }
  return indexes;
}

/** Bar geometry for the 30-day surplus chart. Does not recompute energy. */
export function layoutSurplusChart(rows: SurplusBarInput[], width = 720): SurplusChartLayout {
  const yLabelGap = Y_LABEL_GAP;
  const plotLeft = Y_LABEL_COLUMN + yLabelGap;
  const plotRight = 4;
  const plotTop = 18;
  const plotH = 168;
  const xLabelBaseline = plotTop + plotH + 16;
  const height = xLabelBaseline + HEIGHT_PAD;
  const plotBottom = height - (plotTop + plotH);
  const plotW = Math.max(1, width - plotLeft - plotRight);
  const maxData = rows.reduce((highest, row) => Math.max(highest, Math.max(0, row.surplusGwh)), 0);
  const axis = niceAxis(0, maxData <= 0 ? 1 : maxData, 4);
  const yMax = Math.max(axis.max, 1e-9);
  const yOf = (gwh: number) => plotTop + plotH - (Math.max(0, gwh) / yMax) * plotH;
  const count = Math.max(rows.length, 1);
  const gap = rows.length > 20 ? 2 : 3;
  const barW = Math.max(1, (plotW - gap * Math.max(0, count - 1)) / count);
  const weeks = weekLabelIndexes(rows.length);
  const weekSet = new Set(weeks);
  const gridX2 = width - plotRight;

  const bars = rows.map((row, index) => {
    const surplus = Math.max(0, row.surplusGwh);
    const absorbed = Math.max(0, row.absorbedGwh);
    const absorbedDrawn = Math.min(absorbed, surplus);
    const x = plotLeft + index * (barW + gap);
    const surplusH = (surplus / yMax) * plotH;
    const absorbedH = (absorbedDrawn / yMax) * plotH;
    const weekPos = weeks.indexOf(index);
    let label: string | null = null;
    let labelX: number | null = null;
    let labelAnchor: XLabelAnchor | null = null;
    if (weekSet.has(index)) {
      label = formatChartDay(row.dateBerlin);
      const isFirst = weekPos === 0;
      const isLast = weekPos === weeks.length - 1;
      if (isLast && !isFirst) {
        labelAnchor = "end";
        labelX = gridX2;
      } else if (isFirst) {
        labelAnchor = "start";
        labelX = plotLeft;
      } else {
        labelAnchor = "middle";
        labelX = x + barW / 2;
      }
    }
    return {
      dateBerlin: row.dateBerlin,
      surplusGwh: row.surplusGwh,
      absorbedGwh: row.absorbedGwh,
      absorbedDrawnGwh: absorbedDrawn,
      x,
      width: barW,
      surplusY: yOf(surplus),
      surplusH,
      absorbedY: yOf(absorbedDrawn),
      absorbedH,
      label,
      labelX,
      labelAnchor,
    };
  });

  const ticks = axis.ticks
    .filter((value) => value >= -1e-9 && value <= yMax + 1e-6)
    .map((value) => ({ value: Math.max(0, value), y: yOf(Math.max(0, value)) }));

  return {
    width,
    height,
    plotLeft,
    plotRight,
    plotTop,
    plotBottom,
    yLabelGap,
    yLabelX: plotLeft - yLabelGap,
    gridX1: plotLeft,
    gridX2,
    yMax,
    ticks,
    bars,
  };
}
