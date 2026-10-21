import {
  buildLiveDispatchStory,
  chooseDispatchDay,
  chooseStorageDay,
  LIVE_DISPATCH_RTE,
  roundPeakDeltaGw,
  scaleFleet,
  socEdge,
} from "@/lib/liveFleetDispatch";
import { MORE_STORAGE_ROUND_TRIP } from "@/lib/moreStorage";
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
  it("rounds the evening-peak delta once from the unrounded peaks", () => {
    expect(roundPeakDeltaGw(38.052, 33.54)).toBe(4.5);
    expect(roundPeakDeltaGw(38.0521, 33.53656)).toBe(4.5);
    expect(Math.round((Math.round(38.0521 * 10) / 10 - Math.round(33.53656 * 10) / 10) * 10) / 10).toBe(4.6);
    expect(roundPeakDeltaGw(38.0521, 31.692735)).toBe(6.4);
    expect(roundPeakDeltaGw(38.052, 30.66)).toBe(7.4);
    expect(roundPeakDeltaGw(38.0521, 30.66818)).toBe(7.4);
  });

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
    expect(story.rte).toBe(MORE_STORAGE_ROUND_TRIP);
    expect(LIVE_DISPATCH_RTE).toBe(MORE_STORAGE_ROUND_TRIP);
    expect(story.points[0]?.soc).toBe(0);
  });

  it("lowers the evening peak by several gigawatts when stored energy covers the window", () => {
    const day = dayFromResidual("2026-10-20", (hour) => {
      if (hour >= 11 && hour < 15) return -20_000;
      if (hour >= 17 && hour < 21) return 48_000;
      return 20_000;
    });
    const story = buildLiveDispatchStory({
      day,
      fallback: false,
      powerMw: 10_000,
      energyMwh: 40_000,
      factor: 1,
    });
    expect(story.eveningPeakBeforeGw).toBeCloseTo(48, 5);
    expect(story.eveningPeakAfterGw).not.toBeNull();
    const cut = (story.eveningPeakBeforeGw ?? 0) - (story.eveningPeakAfterGw ?? 0);
    expect(cut).toBeGreaterThan(5);
    expect(story.chargedGwh).toBeGreaterThan(30);
    expect(story.dischargedGwh).toBeCloseTo(story.chargedGwh * MORE_STORAGE_ROUND_TRIP, 1);
  });

  it("holds discharged energy to (charged − end-of-day SoC) × round-trip efficiency", () => {
    const spike = dayFromResidual("2026-10-20", (hour) => {
      if (hour >= 10 && hour < 15) return -20_000;
      if (hour >= 18 && hour < 19) return 40_000;
      if (hour >= 17) return 12_000;
      return 8_000;
    });
    const limited = buildLiveDispatchStory({
      day: spike,
      fallback: false,
      powerMw: 2_000,
      energyMwh: 8_000,
      factor: 1,
    });
    expect(limited.chargedGwh).toBeGreaterThan(limited.dischargedGwh);
    expect(limited.endSocGwh).toBeGreaterThan(1);
    expect(limited.dischargedGwh).toBeCloseTo((limited.chargedGwh - limited.endSocGwh) * LIVE_DISPATCH_RTE, 5);
    expect(limited.points[limited.points.length - 1]?.soc).toBeCloseTo(limited.endSocGwh / (limited.energyMwh / 1000), 5);

    const plateau = dayFromResidual("2026-10-20", (hour) => {
      if (hour >= 11 && hour < 15) return -20_000;
      if (hour >= 17 && hour < 21) return 48_000;
      return 20_000;
    });
    const covered = buildLiveDispatchStory({
      day: plateau,
      fallback: false,
      powerMw: 10_000,
      energyMwh: 40_000,
      factor: 1,
    });
    expect(covered.endSocGwh).toBeLessThan(0.05);
    expect(covered.dischargedGwh).toBeCloseTo((covered.chargedGwh - covered.endSocGwh) * LIVE_DISPATCH_RTE, 5);
    expect(covered.dischargedGwh).toBeCloseTo(covered.chargedGwh * LIVE_DISPATCH_RTE - covered.endSocGwh * LIVE_DISPATCH_RTE, 5);
  });

  it("leaves the peak unchanged when there is no surplus to charge", () => {
    const day = dayFromResidual("2026-10-20", () => 30_000);
    const story = buildLiveDispatchStory({
      day,
      fallback: false,
      powerMw: 10_000,
      energyMwh: 40_000,
      factor: 1,
    });
    expect(story.chargedGwh).toBe(0);
    expect(story.dischargedGwh).toBeCloseTo(0, 5);
    expect(story.eveningPeakAfterGw).toBeCloseTo(story.eveningPeakBeforeGw ?? 0, 5);
  });

  it("starts empty and reaches a full battery when surplus exceeds capacity", () => {
    const day = dayFromResidual("2026-10-20", duck);
    const story = buildLiveDispatchStory({
      day,
      fallback: false,
      powerMw: 2_000,
      energyMwh: 50,
      factor: 1,
    });
    const edges = new Set(story.points.map((point) => socEdge(point.soc * 100)));
    expect(edges.has("empty")).toBe(true);
    expect(edges.has("full")).toBe(true);
    for (const point of story.points) {
      expect(point.soc).toBeGreaterThanOrEqual(0);
      expect(point.soc).toBeLessThanOrEqual(1);
    }
  });

  it("picks the latest day that has both surplus and an evening", () => {
    const older = dayFromResidual("2026-10-19", duck);
    const yesterday = dayFromResidual("2026-10-20", () => 30_000);
    const morning: ResidualDay = {
      dateBerlin: "2026-10-21",
      slots: older.slots.filter((slot) => slot.hourBerlin < 12),
    };
    expect(chooseStorageDay([morning, yesterday, older], "2026-10-21")?.day.dateBerlin).toBe("2026-10-19");
    expect(chooseStorageDay([morning, yesterday, older], "2026-10-21")?.fallback).toBe(true);
    expect(chooseStorageDay([older], "2026-10-19")?.fallback).toBe(false);
  });
});
