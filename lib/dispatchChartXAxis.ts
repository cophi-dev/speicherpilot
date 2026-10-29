import { berlinClockParts } from "@/lib/quarterMarks";

export const MIN_X_LABEL_SPACING_PX = 44;

export type DispatchChartSampleLike = {
  hour: number;
  timestampIso?: string;
  slotIndex?: number;
  slotCount?: number;
  timeLabel?: string;
};

export type DispatchChartXAxisMark = {
  index?: number;
  hour?: number;
  label: string;
  anchor: "start" | "middle" | "end";
};

function usesSlotIndex(samples: DispatchChartSampleLike[]): boolean {
  return samples.length > 0 && samples.every((sample) => sample.slotIndex !== undefined && sample.slotCount !== undefined);
}

export function xLeftForSample(
  samples: DispatchChartSampleLike[],
  index: number,
  padLeft: number,
  plotW: number
): number {
  const sample = samples[index];
  if (!sample) {
    return padLeft;
  }
  if (usesSlotIndex(samples)) {
    const count = sample.slotCount ?? samples.length;
    return padLeft + ((sample.slotIndex ?? index) / count) * plotW;
  }
  return padLeft + (sample.hour / 24) * plotW;
}

/** Full Berlin hour boundary (minute 00), always include day start. */
export function isFullHourMarkSample(sample: DispatchChartSampleLike, index: number): boolean {
  if (index === 0) {
    return true;
  }
  if (sample.timestampIso) {
    const { hm } = berlinClockParts(sample.timestampIso);
    return hm.endsWith(":00");
  }
  const minutes = Math.round((sample.hour - Math.floor(sample.hour)) * 60);
  return minutes === 0;
}

export function shortAxisTimeLabel(label: string): string {
  return label.length > 5 ? label.slice(0, 5) : label;
}

export function estimateXAxisLabelWidthPx(label: string): number {
  return Math.max(MIN_X_LABEL_SPACING_PX, label.length * 6.5 + 10);
}

export function hourStepForPlotWidth(plotW: number): number {
  if (plotW < 400) {
    return 6;
  }
  if (plotW < 900) {
    return 3;
  }
  return 2;
}

function berlinHourAt(sample: DispatchChartSampleLike): number {
  if (sample.timestampIso) {
    const { hm } = berlinClockParts(sample.timestampIso);
    return Number(hm.slice(0, 2));
  }
  return Math.floor(sample.hour) % 24;
}

function labelBox(x: number, anchor: "start" | "middle" | "end", width: number): [number, number] {
  if (anchor === "start") {
    return [x, x + width];
  }
  if (anchor === "end") {
    return [x - width, x];
  }
  const half = width / 2;
  return [x - half, x + half];
}

function boxesOverlap(a: [number, number], b: [number, number], gap = 2): boolean {
  return a[0] < b[1] + gap && b[0] < a[1] + gap;
}

function anchorForMark(index: number, lastIndex: number): "start" | "middle" | "end" {
  if (index === 0) {
    return "start";
  }
  if (index === lastIndex) {
    return "end";
  }
  return "middle";
}

function clipBoxToPlot(box: [number, number], minX: number, maxX: number): boolean {
  return box[0] >= minX - 0.5 && box[1] <= maxX + 0.5;
}

export function filterXAxisMarksBySpacing(
  marks: Array<{ index: number; label: string; x: number }>,
  options: { minX: number; maxX: number; minGapPx?: number }
): DispatchChartXAxisMark[] {
  const { minX, maxX, minGapPx = MIN_X_LABEL_SPACING_PX } = options;
  if (marks.length === 0) {
    return [];
  }
  const sorted = [...marks].sort((a, b) => a.x - b.x);
  const lastIndex = sorted[sorted.length - 1]?.index ?? 0;
  const kept: typeof sorted = [];

  for (const mark of sorted) {
    const anchor = anchorForMark(mark.index, lastIndex);
    const width = Math.max(estimateXAxisLabelWidthPx(mark.label), minGapPx);
    const box = labelBox(mark.x, anchor, width);
    if (!clipBoxToPlot(box, minX, maxX)) {
      if (mark.index !== 0 && mark.index !== lastIndex) {
        continue;
      }
      if (mark.index === 0 && box[1] > maxX) {
        continue;
      }
      if (mark.index === lastIndex && box[0] < minX) {
        continue;
      }
    }
    const overlaps = kept.some((other) => {
      const otherAnchor = anchorForMark(other.index, lastIndex);
      const otherBox = labelBox(other.x, otherAnchor, Math.max(estimateXAxisLabelWidthPx(other.label), minGapPx));
      return boxesOverlap(box, otherBox);
    });
    if (!overlaps) {
      kept.push(mark);
    }
  }

  return kept.map((mark) => ({
    index: mark.index,
    label: mark.label,
    anchor: anchorForMark(mark.index, lastIndex),
  }));
}

export function buildSlotIndexXAxisMarks(
  samples: DispatchChartSampleLike[],
  plotW: number,
  padLeft: number,
  padRight: number,
  chartWidth: number
): DispatchChartXAxisMark[] {
  const step = hourStepForPlotWidth(plotW);
  const minX = padLeft;
  const maxX = chartWidth - padRight;
  const candidates: Array<{ index: number; label: string; x: number }> = [];
  const seenShort = new Set<string>();

  for (let index = 0; index < samples.length; index += 1) {
    if (!isFullHourMarkSample(samples[index], index)) {
      continue;
    }
    const raw = samples[index].timeLabel ?? "";
    const short = shortAxisTimeLabel(raw);
    if (seenShort.has(short)) {
      continue;
    }
    seenShort.add(short);
    const hour = berlinHourAt(samples[index]);
    if (index !== 0 && hour % step !== 0) {
      continue;
    }
    candidates.push({
      index,
      label: short,
      x: xLeftForSample(samples, index, padLeft, plotW),
    });
  }

  return filterXAxisMarksBySpacing(candidates, { minX, maxX });
}

export function buildLegacyHourXAxisMarks(plotW: number, mobile: boolean): DispatchChartXAxisMark[] {
  const step = mobile ? 6 : hourStepForPlotWidth(plotW);
  return [0, 3, 6, 9, 12, 15, 18, 21, 24]
    .filter((hour) => hour % step === 0)
    .map((hour) => ({
      hour,
      label: String(hour).padStart(2, "0"),
      anchor: (hour === 0 ? "start" : hour === 24 ? "end" : "middle") as "start" | "middle" | "end",
    }));
}

export function buildDispatchDayChartXAxisMarks(
  samples: DispatchChartSampleLike[],
  options: {
    plotW: number;
    padLeft: number;
    padRight: number;
    chartWidth: number;
    mobile: boolean;
  }
): DispatchChartXAxisMark[] {
  if (!usesSlotIndex(samples)) {
    return buildLegacyHourXAxisMarks(options.plotW, options.mobile);
  }
  return buildSlotIndexXAxisMarks(samples, options.plotW, options.padLeft, options.padRight, options.chartWidth);
}
