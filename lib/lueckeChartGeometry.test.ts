import {
  assertMonotonicSlotXs,
  lueckeDayKind,
  plotXForAxisHour,
  plotXFromHour,
  plotXFromPeakAt,
  plotXFromSlotIndex,
  slotIndexAtLocalHour,
} from "@/lib/lueckeChartGeometry";
import type { ResidualSlot } from "@/lib/windSolarResidual";

function slot(h: number, m: number, iso = ""): ResidualSlot {
  return {
    timestampIso: iso,
    hourBerlin: h,
    minuteBerlin: m,
    loadMw: 1,
    windMw: 0,
    solarMw: 0,
  };
}

/** 96 Viertelstunden, linear 00:00–23:45 */
function standardDaySlots(): ResidualSlot[] {
  return Array.from({ length: 96 }, (_, i) => {
    const totalMin = i * 15;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return slot(h, m);
  });
}

/** Herbst-Umstellung: 100 Slots, 02:00–02:45 doppelt */
function fallDstSlots(): ResidualSlot[] {
  const out: ResidualSlot[] = [];
  for (let i = 0; i < 96; i += 1) {
    const totalMin = i * 15;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    out.push(slot(h, m, `a-${i}`));
  }
  for (let m = 0; m < 60; m += 15) {
    out.push(slot(2, m, `b-${m}`));
  }
  expect(out.length).toBe(100);
  return out;
}

/** Frühling: 92 Slots (kein 02:00–02:45-Block) */
function springDstSlots(): ResidualSlot[] {
  const out: ResidualSlot[] = [];
  for (let h = 0; h < 24; h += 1) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 2 && m < 60) continue;
      out.push(slot(h, m));
    }
  }
  expect(out.length).toBe(92);
  return out;
}

describe("lueckeChartGeometry", () => {
  const padLeft = 36;
  const plotW = 300;

  it("standard 96: axis hour 6 aligns with slot index", () => {
    const slots = standardDaySlots();
    expect(lueckeDayKind(slots.length)).toBe("standard-96");
    const x6 = plotXForAxisHour(6, slots, padLeft, plotW);
    expect(x6).toBe(plotXFromSlotIndex(24, 96, padLeft, plotW));
    expect(slotIndexAtLocalHour(slots, 6)).toBe(24);
    expect(plotXForAxisHour(24, slots, padLeft, plotW)).toBe(plotXFromSlotIndex(95, 96, padLeft, plotW));
  });

  it("fall 100: monotonic X, no wall-clock overlap", () => {
    const slots = fallDstSlots();
    expect(lueckeDayKind(slots.length)).toBe("dst-fall-100");
    const { monotonic } = assertMonotonicSlotXs(slots, padLeft, plotW);
    expect(monotonic).toBe(true);
    expect(slotIndexAtLocalHour(slots, 2)).toBe(8);
    const xFirst2 = plotXFromSlotIndex(8, 100, padLeft, plotW);
    const xSecond2 = plotXFromSlotIndex(96, 100, padLeft, plotW);
    expect(xSecond2).toBeGreaterThan(xFirst2);
  });

  it("spring 92: monotonic X", () => {
    const slots = springDstSlots();
    expect(lueckeDayKind(slots.length)).toBe("dst-spring-92");
    const { monotonic } = assertMonotonicSlotXs(slots, padLeft, plotW);
    expect(monotonic).toBe(true);
  });

  it("peak 18:15 on standard day matches axis grid", () => {
    const slots = standardDaySlots();
    const xPeak = plotXFromPeakAt(slots, "18:15", padLeft, plotW);
    const x1815 = plotXFromSlotIndex(73, 96, padLeft, plotW);
    expect(xPeak).toBeCloseTo(x1815, 4);
  });
});
