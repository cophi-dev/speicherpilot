import { areaTrueRadius, buildNetzbriefCatalog, daysAfter, hourClock, issueCsv, midnightSeamClosed, mondayOf, northNumber, priceInk, storageNumber, uhrNumber } from "@/lib/netzbrief";
import type { LargeBatteryFleet } from "@/lib/largeBatteryFleet";
import type { ResidualDay } from "@/lib/windSolarResidual";
import { zoneShareQuarters } from "@/lib/zoneShare";

const fleet: LargeBatteryFleet = {
  powerGw: 4.5,
  energyGwh: 7.9,
  durationHours: 7.9 / 4.5,
  year: "2026",
  updatedAtIso: "2026-10-21T00:00:00.000Z",
  updatedLabel: { de: "21. Oktober 2026", en: "21 October 2026" },
  datasource: "MaStR",
  source: "battery-charts",
  jsonUrl: "https://battery-charts.de/de/battery-charts-de/",
  chartUrl: "https://battery-charts.de/de/battery-charts-de/",
};

function day(dateBerlin: string, slots: ResidualDay["slots"]): ResidualDay {
  return { dateBerlin, slots };
}

function slot(hour: number, minute: number, loadMw: number, windMw: number, solarMw: number): ResidualDay["slots"][number] {
  return {
    timestampIso: `${hour}:${minute}`,
    hourBerlin: hour,
    minuteBerlin: minute,
    loadMw,
    windMw,
    solarMw,
  };
}

describe("Netzbrief geometry and numbers", () => {
  it("uses an area-true radius and closes the midnight seam only when both ends exist", () => {
    expect(areaTrueRadius(0, 40)).toBe(0);
    expect(areaTrueRadius(10, 40)).toBeCloseTo(0.5);
    expect(areaTrueRadius(40, 40)).toBe(1);
    expect(midnightSeamClosed([0, 23.75])).toBe(true);
    expect(midnightSeamClosed([0, 12])).toBe(false);
  });

  it("keeps issue numbers stable", () => {
    expect(uhrNumber("2026-10-01")).toBe(10);
    expect(uhrNumber("2026-10-21")).toBe(30);
    expect(daysAfter("2026-10-01", "2026-09-30")).toBe(-1);
    expect(mondayOf("2026-10-21")).toBe("2026-10-19");
    expect(storageNumber("2026-10-21")).toBe(203);
    expect(northNumber("2026-10-21")).toBe(303);
    expect(hourClock(17.5)).toBe("17:30");
  });

  it("maps the cheapest hour to lighter ink than the dearest hour", () => {
    expect(priceInk(10, 10, 80)).toBeLessThan(priceInk(80, 10, 80));
    expect(priceInk(10, 10, 80)).toBeGreaterThan(0);
    expect(priceInk(80, 10, 80)).toBeLessThanOrEqual(1);
  });
});

describe("zone shares", () => {
  it("drops a quarter-hour when one series is null and keeps a published zero", () => {
    const rows = zoneShareQuarters({
      northWindOn: [
        { unixMs: Date.parse("2026-10-21T09:00:00+02:00"), value: 100 },
        { unixMs: Date.parse("2026-10-21T09:15:00+02:00"), value: 0 },
      ],
      northWindOff: [
        { unixMs: Date.parse("2026-10-21T09:00:00+02:00"), value: 50 },
        { unixMs: Date.parse("2026-10-21T09:15:00+02:00"), value: null },
      ],
      northPv: [
        { unixMs: Date.parse("2026-10-21T09:00:00+02:00"), value: 10 },
        { unixMs: Date.parse("2026-10-21T09:15:00+02:00"), value: 10 },
      ],
      northLoad: [
        { unixMs: Date.parse("2026-10-21T09:00:00+02:00"), value: 200 },
        { unixMs: Date.parse("2026-10-21T09:15:00+02:00"), value: 200 },
      ],
      southWindOn: [
        { unixMs: Date.parse("2026-10-21T09:00:00+02:00"), value: 20 },
        { unixMs: Date.parse("2026-10-21T09:15:00+02:00"), value: 20 },
      ],
      southPv: [
        { unixMs: Date.parse("2026-10-21T09:00:00+02:00"), value: 5 },
        { unixMs: Date.parse("2026-10-21T09:15:00+02:00"), value: 5 },
      ],
      southLoad: [
        { unixMs: Date.parse("2026-10-21T09:00:00+02:00"), value: 100 },
        { unixMs: Date.parse("2026-10-21T09:15:00+02:00"), value: 100 },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].northPct).toBeCloseTo(((100 + 50 + 10) / 200) * 100);
    expect(rows[0].southPct).toBeCloseTo(((20 + 5) / 100) * 100);
  });
});

describe("Netzbrief catalog", () => {
  const surplus = day("2026-10-11", [
    slot(0, 0, 40_000, 10_000, 0),
    slot(12, 0, 30_000, 40_000, 8_000),
    slot(18, 0, 55_000, 12_000, 0),
    slot(23, 45, 42_000, 11_000, 0),
  ]);
  const today = day("2026-10-21", [
    slot(0, 0, 50_000, 8_000, 0),
    slot(9, 0, 48_000, 6_000, 2_000),
    slot(12, 0, 46_000, 7_000, 4_000),
    slot(15, 0, 47_000, 8_000, 1_000),
  ]);

  const catalog = buildNetzbriefCatalog({
    todayKey: "2026-10-21",
    days: [surplus, today],
    fleet,
    zones: [
      {
        dateKey: "2026-10-21",
        slots: [
          { unixMs: 1, hour: 8, northPct: 40, southPct: 8 },
          { unixMs: 2, hour: 12, northPct: 55, southPct: 12 },
          { unixMs: 3, hour: 16, northPct: 30, southPct: 9 },
          { unixMs: 4, hour: 20, northPct: 22, southPct: 6 },
        ],
      },
    ],
    prices: [
      { unixMs: Date.parse("2026-10-21T03:00:00+02:00"), eurPerMwh: 12.5 },
      { unixMs: Date.parse("2026-10-21T18:00:00+02:00"), eurPerMwh: 180 },
    ],
    peak: {
      limitKw: 90,
      slots: [
        { hour: 8, beforeKw: 40, afterKw: 40 },
        { hour: 12, beforeKw: 70, afterKw: 60 },
        { hour: 17.5, beforeKw: 120, afterKw: 90 },
        { hour: 20, beforeKw: 50, afterKw: 50 },
      ],
    },
  });

  it("ships one issue of each format and keeps the price wording descriptive", () => {
    const formats = new Set(catalog.map((issue) => issue.format));
    expect(formats).toEqual(new Set(["uhr", "speicher", "nord-sued", "erklaert"]));
    const clock = catalog.find((issue) => issue.format === "uhr" && issue.dateKey === "2026-10-11");
    expect(clock?.clock?.closed).toBe(true);
    expect(clock?.frame).toBe("SPEICHERPILOT · NETZBRIEF #020 · UHR");
    const live = catalog.find((issue) => issue.format === "uhr" && issue.dateKey === "2026-10-21");
    expect(live?.clock?.closed).toBe(false);
    expect(live?.statement.de).toContain("kein Überschuss");
    expect(live?.prices?.minHour).toBe(3);
    expect(live?.prices?.maxHour).toBe(18);
    const stored = catalog.find((issue) => issue.format === "speicher");
    expect(stored?.statement.de).toContain("fünfmal");
    expect(stored?.statement.de).toContain("Modellschätzung");
    expect(stored?.estimate?.de).toContain("Modellschätzung");
    const zones = catalog.find((issue) => issue.format === "nord-sued");
    expect(zones?.nr).toBe(303);
    expect(zones?.zones?.lineAt100).not.toBe("limit");
    expect(zones?.statement.de).toContain("mehr Wind");
    expect(zones?.statement.de).not.toContain("Engpass");
    const explained = catalog.find((issue) => issue.format === "erklaert");
    expect(explained?.frame).toBe("SPEICHERPILOT · NETZBRIEF #001 · ERKLÄRT");
    expect(explained?.statement.de).toContain("120");
    expect(explained?.source.de).toContain("Beispieldaten");
    const blob = JSON.stringify(catalog);
    expect(blob).not.toMatch(/hier laden|hier entladen|Laden passt/i);
    expect(issueCsv(explained!).startsWith("# SPEICHERPILOT · NETZBRIEF #001")).toBe(true);
    expect(issueCsv(live!)).toContain("eur_pro_mwh");
  });
});
