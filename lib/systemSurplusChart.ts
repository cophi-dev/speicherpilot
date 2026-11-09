import { niceAxis } from "@/lib/niceTicks";

export type SurplusBarInput = {
  dateBerlin: string;
  surplusGwh: number;
  absorbedGwh: number;
};

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
};

export type SurplusChartLayout = {
  width: number;
  height: number;
  plotLeft: number;
  plotTop: number;
  plotBottom: number;
  yMax: number;
  ticks: Array<{ value: number; y: number }>;
  bars: LaidOutSurplusBar[];
};

const WIDTH = 720;
const HEIGHT = 220;

export function formatChartDay(dateBerlin: string): string {
  const parts = dateBerlin.split("-");
  const day = Number(parts[2]);
  const month = Number(parts[1]);
  if (!Number.isFinite(day) || !Number.isFinite(month)) {
    return dateBerlin;
  }
  return `${day}.${month}.`;
}

function labelIndexes(count: number): Set<number> {
  const labels = new Set<number>();
  if (count <= 0) {
    return labels;
  }
  labels.add(0);
  labels.add(count - 1);
  const step = count > 16 ? 7 : 5;
  for (let index = step; index < count - 1; index += step) {
    labels.add(index);
  }
  return labels;
}

/** Bar geometry for the 30-day surplus chart. Does not recompute energy. */
export function layoutSurplusChart(rows: SurplusBarInput[], width = WIDTH): SurplusChartLayout {
  const plotLeft = 48;
  const plotRight = 8;
  const plotTop = 16;
  const plotBottom = 28;
  const plotW = width - plotLeft - plotRight;
  const plotH = HEIGHT - plotTop - plotBottom;
  const maxData = rows.reduce((highest, row) => Math.max(highest, Math.max(0, row.surplusGwh)), 0);
  const axis = niceAxis(0, maxData <= 0 ? 1 : maxData, 4);
  const yMax = Math.max(axis.max, 1e-9);
  const yOf = (gwh: number) => plotTop + plotH - (Math.max(0, gwh) / yMax) * plotH;
  const count = Math.max(rows.length, 1);
  const gap = rows.length > 20 ? 2 : 3;
  const barW = Math.max(1, (plotW - gap * Math.max(0, count - 1)) / count);
  const labels = labelIndexes(rows.length);

  const bars = rows.map((row, index) => {
    const surplus = Math.max(0, row.surplusGwh);
    const absorbed = Math.max(0, row.absorbedGwh);
    const absorbedDrawn = Math.min(absorbed, surplus);
    const x = plotLeft + index * (barW + gap);
    const surplusH = (surplus / yMax) * plotH;
    const absorbedH = (absorbedDrawn / yMax) * plotH;
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
      label: labels.has(index) ? formatChartDay(row.dateBerlin) : null,
    };
  });

  const ticks = axis.ticks
    .filter((value) => value >= -1e-9 && value <= yMax + 1e-6)
    .map((value) => ({ value: Math.max(0, value), y: yOf(Math.max(0, value)) }));

  return {
    width,
    height: HEIGHT,
    plotLeft,
    plotTop,
    plotBottom,
    yMax,
    ticks,
    bars,
  };
}
