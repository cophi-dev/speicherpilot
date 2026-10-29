import { findFirstUnixSecondForBerlinDateKey } from "@/lib/berlinCalendar";
import {
  buildDispatchDayChartXAxisMarks,
  buildSlotIndexXAxisMarks,
  estimateXAxisLabelWidthPx,
  filterXAxisMarksBySpacing,
  isFullHourMarkSample,
  MIN_X_LABEL_SPACING_PX,
  shortAxisTimeLabel,
  xLeftForSample,
  type DispatchChartSampleLike,
} from "@/lib/dispatchChartXAxis";
import { berlinClockParts, uniqueQuarterLabels } from "@/lib/quarterMarks";

function chartPads(width: number) {
  const mobile = width < 600;
  const padLeft = mobile ? 34 : 44;
  const padRight = mobile ? 8 : 10;
  const plotW = Math.max(width - padLeft - padRight, 1);
  return { mobile, padLeft, padRight, plotW, chartWidth: width };
}

function labelBox(x: number, anchor: "start" | "middle" | "end", label: string): [number, number] {
  const w = estimateXAxisLabelWidthPx(label);
  if (anchor === "start") {
    return [x, x + w];
  }
  if (anchor === "end") {
    return [x - w, x];
  }
  const half = w / 2;
  return [x - half, x + half];
}

function marksOverlap(
  marks: ReturnType<typeof buildDispatchDayChartXAxisMarks>,
  samples: DispatchChartSampleLike[],
  padLeft: number,
  plotW: number,
  maxX: number
): boolean {
  const boxes = marks.map((mark) => {
    const x = mark.index !== undefined ? xLeftForSample(samples, mark.index, padLeft, plotW) : padLeft + ((mark.hour ?? 0) / 24) * plotW;
    return labelBox(x, mark.anchor, mark.label);
  });
  for (let i = 0; i < boxes.length; i += 1) {
    if (boxes[i][0] < padLeft - 1 || boxes[i][1] > maxX + 1) {
      return true;
    }
    for (let j = i + 1; j < boxes.length; j += 1) {
      if (boxes[i][0] < boxes[j][1] + 2 && boxes[j][0] < boxes[i][1] + 2) {
        return true;
      }
    }
  }
  return false;
}

function normalDaySamples(): DispatchChartSampleLike[] {
  const start = findFirstUnixSecondForBerlinDateKey("2026-05-07");
  const instants: string[] = [];
  for (let i = 0; i < 96; i += 1) {
    instants.push(new Date((start + i * 900) * 1000).toISOString());
  }
  const labels = uniqueQuarterLabels(instants);
  return instants.map((timestampIso, slotIndex) => ({
    hour: slotIndex / 4,
    timestampIso,
    slotIndex,
    slotCount: 96,
    timeLabel: labels[slotIndex],
    ohne: 0,
    mit: 0,
    charge: 0,
    discharge: 0,
    soc: 0,
  }));
}

function dstFallDaySamples(): DispatchChartSampleLike[] {
  const start = findFirstUnixSecondForBerlinDateKey("2026-10-25");
  const end = findFirstUnixSecondForBerlinDateKey("2026-10-26");
  const instants: string[] = [];
  for (let unix = start; unix < end; unix += 900) {
    instants.push(new Date(unix * 1000).toISOString());
  }
  const labels = uniqueQuarterLabels(instants);
  return instants.map((timestampIso, slotIndex) => ({
    hour: slotIndex / 4,
    timestampIso,
    slotIndex,
    slotCount: instants.length,
    timeLabel: labels[slotIndex],
    ohne: 0,
    mit: 0,
    charge: 0,
    discharge: 0,
    soc: 0,
  }));
}

describe("dispatchChartXAxis", () => {
  it("treats 02:00 +02 as a full hour for axis marks", () => {
    const sample = {
      hour: 2,
      timestampIso: "2026-10-25T02:00:00+02:00",
      timeLabel: "02:00 +02",
    };
    expect(isFullHourMarkSample(sample, 8)).toBe(true);
    expect(shortAxisTimeLabel("02:00 +02")).toBe("02:00");
  });

  it("includes 02:00 on the DST fall day between 01:00 and 03:00", () => {
    const samples = dstFallDaySamples();
    expect(samples).toHaveLength(100);
    const { padLeft, padRight, plotW, chartWidth } = chartPads(1440);
    const marks = buildSlotIndexXAxisMarks(samples, plotW, padLeft, padRight, chartWidth);
    const labels = marks.map((mark) => mark.label);
    expect(labels).toContain("02:00");
    expect(labels.filter((label) => label === "02:00")).toHaveLength(1);
    const fullHourIndices = samples
      .map((sample, index) => (isFullHourMarkSample(sample, index) ? index : -1))
      .filter((index) => index >= 0);
    const twoOClockSlots = fullHourIndices.filter((index) => shortAxisTimeLabel(samples[index].timeLabel ?? "") === "02:00");
    expect(twoOClockSlots.length).toBe(2);
    expect(marks.some((mark) => twoOClockSlots.includes(mark.index!))).toBe(true);
  });

  it("does not overlap label boxes at common viewport widths", () => {
    const samples = normalDaySamples();
    for (const width of [390, 768, 1024, 1440]) {
      const { mobile, padLeft, padRight, plotW, chartWidth } = chartPads(width);
      const marks = buildDispatchDayChartXAxisMarks(samples, { plotW, padLeft, padRight, chartWidth, mobile });
      expect(marks.length).toBeGreaterThan(1);
      expect(marksOverlap(marks, samples, padLeft, plotW, chartWidth - padRight)).toBe(false);
    }
  });

  it("does not overlap on the 25-hour DST chart width", () => {
    const samples = dstFallDaySamples();
    for (const width of [390, 768, 1024, 1440]) {
      const { mobile, padLeft, padRight, plotW, chartWidth } = chartPads(width);
      const marks = buildDispatchDayChartXAxisMarks(samples, { plotW, padLeft, padRight, chartWidth, mobile });
      expect(marksOverlap(marks, samples, padLeft, plotW, chartWidth - padRight)).toBe(false);
    }
  });

  it("respects minimum spacing when filtering", () => {
    const filtered = filterXAxisMarksBySpacing(
      [
        { index: 0, label: "00:00", x: 44 },
        { index: 1, label: "01:00", x: 60 },
        { index: 95, label: "23:00", x: 400 },
      ],
      { minX: 44, maxX: 430 }
    );
    expect(filtered.length).toBeLessThan(3);
    expect(filtered[0]?.label).toBe("00:00");
  });

  it("uses coarser hour steps on narrow plot widths", () => {
    const samples = normalDaySamples();
    const narrow = buildSlotIndexXAxisMarks(samples, 348, 34, 8, 390);
    const wide = buildSlotIndexXAxisMarks(samples, 1386, 44, 10, 1440);
    expect(narrow.length).toBeLessThan(wide.length);
    expect(narrow.some((mark) => mark.label === "06:00")).toBe(true);
    expect(narrow.some((mark) => mark.label === "01:00")).toBe(false);
  });

  it("detects Berlin full hours from timestampIso", () => {
    const parts = berlinClockParts("2026-10-25T02:15:00+02:00");
    expect(parts.hm).toBe("02:15");
    expect(isFullHourMarkSample({ hour: 2.25, timestampIso: "2026-10-25T02:15:00+02:00" }, 9)).toBe(false);
    expect(MIN_X_LABEL_SPACING_PX).toBeGreaterThanOrEqual(44);
  });
});
