import { spawnSync } from "node:child_process";

import tableJson from "@/data/fca/fca-table.json";
import { fcaTableSchema, type FcaTable } from "@/lib/fcaTableSchema";
import {
  interpolateMonths,
  limitValueText,
  queryFromRaw,
  rawFromQuery,
  scenarioCopy,
  scenarioSeries,
  validateRaw,
  type FcaRaw,
} from "@/lib/fcaScenarios";

function syntheticTable(): FcaTable {
  const hours = [0.5, 1, 1.5, 2, 2.5, 3, 4, 6];
  const limits = Array.from({ length: 21 }, (_, index) => Math.round(index * 0.05 * 100) / 100);
  const layer = hours.map(() => limits.map((limit) => Array.from({ length: 12 }, (_, month) => (10 + month * 10) * limit)));
  const year = {
    label: "synthetic",
    start: "2025-01-01",
    end: "2025-12-31",
    days: 365 as const,
    monthDays: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    slotLengths: { "96": 365 },
    values: [layer, layer, layer],
  };
  return {
    schemaVersion: 1,
    retrieved: "2026-10-27",
    source: {
      name: "synthetic",
      license: "CC BY 4.0",
      href: "https://api.energy-charts.info/v2/price?bzn=DE-LU",
      note: "synthetic",
    },
    roundTripEfficiency: 0.85,
    eta: Math.sqrt(0.85),
    hours,
    limits,
    forms: ["fest", "abend", "mittag"],
    horizonMonths: 36,
    years: { "12m": year, "2025": year },
    checks: {
      interpolation: {
        year: "12m",
        form: "fest",
        hours: 2.304,
        limit: 0.37,
        powerMw: 103.5,
        exactEur: 1,
        interpolatedEur: 1,
        relativeError: 0,
      },
      exampleYearEur: { "103.5": 1 },
      exampleMonthSharePct: Array.from({ length: 12 }, () => 8.3),
    },
  };
}

function raw(partial: Partial<FcaRaw> = {}): FcaRaw {
  return {
    power: "103,5",
    energy: "238,5",
    limit: "51,75",
    form: "fest",
    delay: "12",
    startMonth: 1,
    year: "12m",
    ...partial,
  };
}

describe("FCA input checks", () => {
  it("rejects an empty or negative limit and a ratio outside the table", () => {
    expect(validateRaw(raw({ limit: "" })).errors.limit).toBe("Bitte eine Zahl von 0 oder größer eingeben.");
    expect(validateRaw(raw({ limit: "-1" })).errors.limit).toBe("Bitte eine Zahl von 0 oder größer eingeben.");
    expect(validateRaw(raw({ limit: "abc" })).errors.limit).toBe("Bitte eine Zahl von 0 oder größer eingeben.");
    expect(validateRaw(raw({ power: "0", energy: "0" })).errors.power).toBe("Leistung und Kapazität müssen größer als 0 sein.");
    expect(validateRaw(raw({ energy: "1" })).errors.ratio).toMatch(/0,5 bis 6 Stunden/);
    expect(validateRaw(raw({ delay: "49" })).errors.delay).toBe("Bitte höchstens 48 Monate.");
    expect(validateRaw(raw()).inputs).not.toBeNull();
  });

  it("keeps the query round-trip and falls back for unknown enums", () => {
    const params = new URLSearchParams(queryFromRaw(raw({ form: "abend", year: "2025", startMonth: 4, delay: "4" })));
    const parsed = rawFromQuery(params, "de");
    expect(parsed.form).toBe("abend");
    expect(parsed.year).toBe("2025");
    expect(parsed.startMonth).toBe(4);
    expect(rawFromQuery(new URLSearchParams("form=nope&jahr=nope&start=99"), "de").form).toBe("fest");
  });

  it("names the slider value in words", () => {
    expect(limitValueText(51.75, 103.5, "de")).toBe("50 Prozent, 51,75 Megawatt");
  });
});

describe("FCA scenarios", () => {
  const table = syntheticTable();

  it("treats the edge cases without NaN", () => {
    const full = validateRaw(raw()).inputs;
    if (!full) {
      throw new Error("expected valid defaults");
    }
    const half = scenarioSeries(table, full);
    expect(half?.remainPct).toBeCloseTo(50, 4);
    expect(half?.delayPct).toBeCloseTo(100, 4);

    const zero = scenarioSeries(table, { ...full, limitMw: 0 });
    expect(zero?.yearBEur).toBe(0);
    expect(zero?.lossPct).toBeCloseTo(100, 4);
    expect(scenarioCopy(full, zero!, "de").hero).toBe("Mit einer Grenze von 0 MW kann der Speicher im Modell nichts handeln.");

    const unbound = scenarioSeries(table, { ...full, limitMw: 200 });
    expect(unbound?.lossPct).toBeCloseTo(0, 6);
    expect(unbound?.breakevenMonth).toBeNull();
    expect(scenarioCopy({ ...full, limitMw: 200 }, unbound!, "de").result).toMatch(/nie/);
    expect(scenarioCopy({ ...full, limitMw: 200 }, unbound!, "de").hero).toBe("Die Grenze liegt über der Speicherleistung. Sie bremst nichts.");

    const immediate = scenarioSeries(table, { ...full, delayMonths: 0 });
    expect(immediate?.percentC).toEqual(immediate?.percentA);
    expect(scenarioCopy({ ...full, delayMonths: 0 }, immediate!, "de").result).toMatch(/Ohne Verzögerung/);

    const late = scenarioSeries(table, { ...full, delayMonths: 36 });
    expect(late?.cumulativeC[36]).toBe(0);
    expect(scenarioCopy({ ...full, delayMonths: 36 }, late!, "de").result).toMatch(/noch nichts erlöst/);

    const january = scenarioSeries(table, { ...full, delayMonths: 4, startMonth: 1 });
    const june = scenarioSeries(table, { ...full, delayMonths: 4, startMonth: 6 });
    expect(january?.cumulativeA[12]).toBeCloseTo(june?.cumulativeA[12] ?? NaN, 6);
    expect(january?.delayEur).not.toBeCloseTo(june?.delayEur ?? NaN, 0);
    expect(JSON.stringify(half)).not.toMatch(/NaN/);
  });

  it("interpolates a point between the nodes", () => {
    const months = interpolateMonths(table, "12m", "fest", 2.304, 0.37);
    expect(months[0]).toBeCloseTo(3.7, 6);
  });
});

describe("FCA reference table", () => {
  const table = fcaTableSchema.parse(tableJson);

  it("is monotone and concave in the limit, with the documented sources", () => {
    expect(table.retrieved).toBe("2026-10-27");
    expect(table.source.href).toContain("energy-charts.info");
    expect(table.source.license).toMatch(/CC BY 4.0/);
    for (const year of [table.years["12m"], table.years["2025"]]) {
      expect(year.days).toBe(365);
      expect(year.monthDays.reduce((sum, days) => sum + days, 0)).toBe(365);
      const lengths = Object.keys(year.slotLengths);
      expect(lengths.every((length) => ["92", "96", "100"].includes(length))).toBe(true);
      expect(Object.values(year.slotLengths).reduce((sum, count) => sum + count, 0)).toBe(365);
      const full = year.values[0][0][year.values[0][0].length - 1];
      const yearSum = full.reduce((sum, value) => sum + value, 0);
      const monthsSum = year.values[0][0][year.values[0][0].length - 1].reduce((sum, value) => sum + value, 0);
      expect(monthsSum).toBeCloseTo(yearSum, 6);
      for (const form of year.values) {
        for (const hours of form) {
          for (let limit = 1; limit < hours.length; limit += 1) {
            for (let month = 0; month < 12; month += 1) {
              expect(hours[limit][month] + 1e-4).toBeGreaterThanOrEqual(hours[limit - 1][month]);
            }
          }
          for (let limit = 1; limit < hours.length - 1; limit += 1) {
            for (let month = 0; month < 12; month += 1) {
              const chord = 0.5 * (hours[limit - 1][month] + hours[limit + 1][month]);
              expect(hours[limit][month] + 1e-3).toBeGreaterThanOrEqual(chord);
            }
          }
        }
      }
      expect(Math.max(...year.values[0].flatMap((hours) => hours[0]))).toBeLessThan(1e-6);
    }
    const exact = table.checks.interpolation.exactEur;
    const interpolated = interpolateMonths(table, "12m", "fest", 2.304, 0.37).reduce((sum, value) => sum + value, 0) * 103.5;
    expect(Math.abs(interpolated - exact) / exact).toBeLessThan(0.01);
    expect(table.checks.interpolation.relativeError).toBeGreaterThan(-0.01);
    expect(table.checks.interpolation.relativeError).toBeLessThan(0);
    expect(Math.abs(table.checks.exampleYearEur["103.5"] - 9712347)).toBeLessThanOrEqual(1);
    expect(Math.abs(table.checks.exampleYearEur["51.75"] - 7780594)).toBeLessThanOrEqual(1);
  });
});

describe("HiGHS reference", () => {
  it("matches the hand calculation and three published days", () => {
    const hand = spawnSync("python3", ["scripts/fca_lp.py", "hand"], { encoding: "utf8" });
    expect(hand.status).toBe(0);
    const handJson = JSON.parse(hand.stdout) as { eta1: Record<string, number>; eta: Record<string, number>; homogeneity: number };
    expect(handJson.eta1["10"]).toBe(720);
    expect(handJson.eta1["4"]).toBe(360);
    expect(handJson.eta1["0"]).toBe(0);
    expect(handJson.eta["10"]).toBeCloseTo(650.79, 2);
    expect(handJson.eta["4"]).toBe(300);
    expect(handJson.homogeneity).toBeLessThan(1e-6);

    const cases: Array<[string, number, number]> = [
      ["2026-05-01", 103.5, 149589],
      ["2026-05-01", 51.75, 108136],
      ["2026-05-01", 25.9, 66743],
      ["2026-06-24", 103.5, 101073],
      ["2026-06-24", 51.75, 78372],
      ["2026-06-24", 25.9, 52169],
      ["2026-04-14", 103.5, 25454],
      ["2026-04-14", 51.75, 16180],
      ["2026-04-14", 25.9, 9243],
    ];
    for (const [date, limit, expected] of cases) {
      const run = spawnSync("python3", ["scripts/fca_lp.py", "day", date, "103.5", "238.5", String(limit)], { encoding: "utf8" });
      expect(run.status).toBe(0);
      const got = (JSON.parse(run.stdout) as { eur: number }).eur;
      expect(Math.abs(got - expected)).toBeLessThanOrEqual(1);
    }

    const sample = spawnSync("python3", ["scripts/fca_lp.py", "sample"], { encoding: "utf8" });
    expect(sample.status).toBe(0);
    const sampleJson = JSON.parse(sample.stdout) as { days: number; worstMono: number; worstConcave: number; negative: boolean };
    expect(sampleJson.days).toBe(20);
    expect(sampleJson.negative).toBe(false);
    expect(sampleJson.worstMono).toBeGreaterThanOrEqual(-1e-4);
    expect(sampleJson.worstConcave).toBeGreaterThanOrEqual(-1e-3);
  }, 120000);
});
