import { simulateBessDispatch } from "@/lib/bessDispatchSimulator";
import {
  buildLiveDispatchStory,
  chooseDispatchDay,
  LIVE_DISPATCH_RTE,
  scaleFleet,
  socEdge,
} from "@/lib/liveFleetDispatch";
import type { ResidualDay, ResidualSlot } from "@/lib/windSolarResidual";

function dayFromResidual(date: string, residualAt: (hour: number) => number): ResidualDay {
  const slots: ResidualSlot[] = [];
  for (let index = 0; index < 96; index += 1) {
    const hour = Math.floor(index / 4);
    const minute = (index % 4) * 15;
    const clock = hour + minute / 60;
    const loadMw = 50_000;
    const residual = residualAt(clock);
    const renewable = Math.max(0, loadMw - residual);
    slots.push({
      timestampIso: `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+02:00`,
      hourBerlin: hour,
      minuteBerlin: minute,
      loadMw,
      windMw: renewable * 0.7,
      solarMw: renewable * 0.3,
    });
  }
  return { dateBerlin: date, slots };
}

const duck = (hour: number) => {
  if (hour >= 10 && hour < 15) return -12_000;
  if (hour >= 17 && hour < 21) return 48_000;
  return 22_000;
};

describe("live fleet dispatch", () => {
  it("keeps ×1 equal to the cited fleet and scales ×10 on both axes", () => {
    const once = scaleFleet(4_515.54, 7_860.02, 1);
    const ten = scaleFleet(4_515.54, 7_860.02, 10);
    expect(once).toEqual({ powerMw: 4_515.54, energyMwh: 7_860.02 });
    expect(ten.powerMw).toBeCloseTo(once.powerMw * 10, 6);
    expect(ten.energyMwh).toBeCloseTo(once.energyMwh * 10, 6);
  });

  it("uses yesterday only when today has no usable series", () => {
    const yesterday = dayFromResidual("2026-10-20", duck);
    const empty: ResidualDay = { dateBerlin: "2026-10-21", slots: [] };
    expect(chooseDispatchDay(empty, yesterday)).toEqual({ day: yesterday, fallback: true });
    expect(chooseDispatchDay(yesterday, null)?.fallback).toBe(false);
    expect(chooseDispatchDay(empty, null)).toBeNull();
    const morning: ResidualDay = {
      dateBerlin: "2026-10-21",
      slots: yesterday.slots.filter((slot) => slot.hourBerlin < 12),
    };
    expect(chooseDispatchDay(morning, yesterday)?.day.dateBerlin).toBe("2026-10-20");
    expect(chooseDispatchDay(morning, yesterday)?.fallback).toBe(true);
  });

  it("names discharged energy and keeps euro fields off the story", () => {
    const story = buildLiveDispatchStory({
      day: dayFromResidual("2026-10-21", duck),
      fallback: false,
      powerMw: 4_500,
      energyMwh: 8_000,
      factor: 1,
    });
    const ten = buildLiveDispatchStory({
      day: dayFromResidual("2026-10-21", duck),
      fallback: false,
      powerMw: 4_500,
      energyMwh: 8_000,
      factor: 10,
    });
    expect(story.factor).toBe(1);
    expect(ten.powerMw).toBeCloseTo(story.powerMw * 10, 4);
    expect(ten.energyMwh).toBeCloseTo(story.energyMwh * 10, 4);
    expect(story.dischargedGwh).toBeGreaterThan(0);
    expect(story.chargedGwh).toBeGreaterThan(story.dischargedGwh);
    expect(story.eveningPeakBeforeGw).not.toBeNull();
    expect(JSON.stringify(story)).not.toMatch(/€|Eur|grossRevenue/);
    expect(story.rte).toBe(LIVE_DISPATCH_RTE);
  });

  it("reaches the empty and the full state of charge", () => {
    const day = dayFromResidual("2026-10-21", duck);
    const out = simulateBessDispatch({
      powerMW: 2_000,
      energyMWh: 50,
      efficiency: LIVE_DISPATCH_RTE,
      strategy: "arbitrage_gap",
      day: {
        dateBerlin: day.dateBerlin,
        timestampsIso: day.slots.map((slot) => slot.timestampIso),
        hourBerlin: day.slots.map((slot) => slot.hourBerlin + slot.minuteBerlin / 60),
        loadMw: day.slots.map((slot) => slot.loadMw),
        totalGenerationMw: day.slots.map((slot) => slot.windMw + slot.solarMw),
        residualLoadMw: day.slots.map((slot) => slot.loadMw - slot.windMw - slot.solarMw),
        renewableShareOfLoadPct: day.slots.map((slot) => ((slot.windMw + slot.solarMw) / slot.loadMw) * 100),
      },
    });
    const edges = new Set(out.socPct.map(socEdge));
    expect(edges.has("empty")).toBe(true);
    expect(edges.has("full")).toBe(true);
    for (const soc of out.socPct) {
      expect(soc).toBeGreaterThanOrEqual(10 - 0.05);
      expect(soc).toBeLessThanOrEqual(90 + 0.05);
    }
  });
});
