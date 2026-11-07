import { findFirstUnixSecondForBerlinDateKey } from "@/lib/berlinCalendar";
import {
  auditBerlinPowerDay,
  expectedBerlinQuarters,
  pickNewestStrictCompletePowerDayKey,
  strictResidualPreludeComplete,
} from "@/lib/berlinDayCompleteness";
import { parsePowerPayload, slotsInRange } from "@/lib/powerMix";

const base = {
  wind_onshore: 4_000,
  wind_offshore: 1_000,
  solar: 2_000,
  fossil_brown_coal_lignite: 3_000,
  fossil_hard_coal: 1_000,
  fossil_gas: 2_000,
  biomass: 500,
  hydro_run_of_river: 400,
  hydro_water_reservoir: 100,
  hydro_pumped_storage: 50,
  fossil_oil: 10,
  others: 20,
  load_incl_self_consumption: 10_000,
  cross_border_electricity_trading: -500,
  renewable_share_of_load: 40,
};

function fullDay(dateKey: string, quarterCount: number) {
  const start = findFirstUnixSecondForBerlinDateKey(dateKey);
  const rows = [];
  for (let i = 0; i < quarterCount; i += 1) {
    rows.push({
      timestamp: new Date((start + i * 900) * 1000).toISOString(),
      values: { ...base },
    });
  }
  return rows;
}

describe("expectedBerlinQuarters", () => {
  it("uses 96 for a normal day, 100 for DST fall, 92 for DST spring", () => {
    expect(expectedBerlinQuarters("2026-11-06")).toBe(96);
    expect(expectedBerlinQuarters("2026-10-25")).toBe(100);
    expect(expectedBerlinQuarters("2026-03-29")).toBe(92);
  });
});

describe("auditBerlinPowerDay", () => {
  it("rejects 95 quarters that still end at 23:45", () => {
    const dateKey = "2026-11-06";
    const rows = fullDay(dateKey, 96);
    rows.splice(48, 1);
    const parsed = parsePowerPayload({ data: rows });
    const daySlots = slotsInRange(parsed!.slots, dateKey, dateKey);
    expect(daySlots.length).toBe(95);
    const audit = auditBerlinPowerDay(daySlots, dateKey, true);
    expect(audit.ok).toBe(false);
    expect(audit.reason).toBe("count");
  });

  it("rejects missing carrier on one quarter", () => {
    const dateKey = "2026-11-06";
    const rows = fullDay(dateKey, 96);
    rows[10].values.fossil_gas = null;
    const parsed = parsePowerPayload({ data: rows });
    const daySlots = slotsInRange(parsed!.slots, dateKey, dateKey);
    const audit = auditBerlinPowerDay(daySlots, dateKey, true);
    expect(audit.ok).toBe(false);
    expect(audit.reason).toBe("generation");
  });

  it("accepts a complete 100-quarter fall day", () => {
    const dateKey = "2026-10-25";
    const parsed = parsePowerPayload({ data: fullDay(dateKey, 100) });
    const daySlots = slotsInRange(parsed!.slots, dateKey, dateKey);
    expect(auditBerlinPowerDay(daySlots, dateKey, true).ok).toBe(true);
  });
});

describe("strictResidualPreludeComplete contiguous calendar", () => {
  it("rejects when an entire inner calendar day is missing from RAW", () => {
    const day04 = fullDay("2026-11-04", 96);
    const day06 = fullDay("2026-11-06", 96);
    const parsed = parsePowerPayload({ data: [...day04, ...day06] });
    const start = "2026-11-04";
    const end = "2026-11-06";
    expect(strictResidualPreludeComplete(parsed!.slots, true, start, end)).toBe(false);
    expect(buildHomePreludeOk(parsed!.slots, start, end)).toBe(false);
  });
});

function buildHomePreludeOk(slots: import("@/lib/powerMix").PowerSlot[], start: string, end: string) {
  return strictResidualPreludeComplete(slots, true, start, end);
}

describe("pickNewestStrictCompletePowerDayKey", () => {
  it("skips a day with a hole and picks the previous complete day", () => {
    const good = fullDay("2026-11-05", 96);
    const bad = fullDay("2026-11-06", 96);
    bad.splice(20, 1);
    const parsed = parsePowerPayload({ data: [...good, ...bad] });
    const key = pickNewestStrictCompletePowerDayKey(parsed!.slots, true, "2026-11-07");
    expect(key).toBe("2026-11-05");
  });
});
