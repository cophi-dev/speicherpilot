import { buildHeuteImNetz, niceAxis, niceStep } from "@/lib/heuteImNetz";
import type { LargeBatteryFleet } from "@/lib/largeBatteryFleet";
import type { ResidualSlot } from "@/lib/windSolarResidual";

const fleet: LargeBatteryFleet = {
  powerGw: 4.51554,
  energyGwh: 7.86,
  durationHours: 1.74,
  year: "2026",
  updatedAtIso: "2026-10-21T12:00:00.000Z",
  updatedLabel: { de: "21. Oktober 2026", en: "21 October 2026" },
  datasource: "MaStR",
  source: "battery-charts",
  jsonUrl: "https://battery-charts.de/de/battery-charts-de/",
  chartUrl: "https://battery-charts.de/de/battery-charts-de/",
};

function slot(hour: number, minute: number, loadMw: number, windMw: number, solarMw: number): ResidualSlot {
  return {
    timestampIso: `2026-10-21T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`,
    hourBerlin: hour,
    minuteBerlin: minute,
    loadMw,
    windMw,
    solarMw,
  };
}

function day(slots: ResidualSlot[], date = "2026-10-21") {
  return { dateBerlin: date, slots };
}

function quarters(build: (hour: number) => [number, number, number]): ResidualSlot[] {
  const slots: ResidualSlot[] = [];
  for (let step = 0; step < 96; step += 1) {
    const hour = Math.floor(step / 4);
    const minute = (step % 4) * 15;
    const [load, wind, solar] = build(step / 4);
    slots.push(slot(hour, minute, load, wind, solar));
  }
  return slots;
}

const now = new Date("2026-10-21T10:00:00.000Z");

describe("heute im netz", () => {
  it("uses a 1-2-5 axis that includes zero", () => {
    expect(niceStep(37)).toBe(10);
    const axis = niceAxis(-12, 48);
    expect(axis.ticks[0]).toBeLessThanOrEqual(-12);
    expect(axis.ticks[axis.ticks.length - 1]).toBeGreaterThanOrEqual(48);
    expect(axis.ticks).toContain(0);
    expect(new Set(axis.ticks.map((tick) => Math.abs(tick % 10)))).toEqual(new Set([0]));
  });

  it("counts surplus hours and numbers marks from left to right", () => {
    const slots = quarters((hour) => {
      const surplus = hour >= 8 && hour < 16;
      const deep = hour >= 12 && hour < 13;
      const load = 50_000 + (hour >= 18 && hour < 21 ? 20_000 : 0);
      const wind = surplus ? 20_000 : 8_000;
      const solar = surplus ? 40_000 + (deep ? 15_000 : 0) : 2_000;
      return [load, wind, solar];
    });
    const view = buildHeuteImNetz({
      now,
      todayKey: "2026-10-21",
      today: day(slots),
      yesterday: null,
      fleet,
      hertzSharePct: 70,
      dayAheadEurPerMwh: 42,
    });
    expect(view.surplusHours).toBeCloseTo(8, 5);
    expect(view.figureValue).toBeCloseTo(8, 5);
    expect(view.headline.de).toContain("mehr Wind und Sonne");
    expect(view.headline.de).not.toMatch(/Hamburg|50Hertz|Engpass/);
    expect(view.detail.de).toContain("Residuallast");
    expect(view.annotations.map((item) => item.n)).toEqual([1, 2, 3]);
    const hours = view.annotations.map((item) => item.hour);
    expect(hours).toEqual([...hours].sort((left, right) => left - right));
    expect(view.annotations.some((item) => item.label.de.startsWith("Überschuss"))).toBe(true);
    expect(view.annotations.some((item) => item.label.de.startsWith("Abendspitze"))).toBe(true);
    expect(view.fleetShare).not.toBeNull();
    expect(view.fleetShare!).toBeCloseTo(7.86 / view.surplusGwh, 5);
    expect(view.source.de).toContain("Battery Charts");
    expect(view.source.de).toContain("21.10.2026");
    expect(view.ticker.map((item) => item.id)).toEqual(["clock", "load", "wind", "price", "hertz"]);
  });

  it("says there is no surplus today instead of borrowing another day", () => {
    const slots = quarters(() => [60_000, 8_000, 4_000]);
    const yesterday = quarters(() => [60_000, 8_000, 4_000]);
    const view = buildHeuteImNetz({
      now,
      todayKey: "2026-10-21",
      today: day(slots),
      yesterday: day(yesterday, "2026-10-20"),
      fleet,
      hertzSharePct: null,
      dayAheadEurPerMwh: null,
    });
    expect(view.surplusHours).toBe(0);
    expect(view.headline.de).toContain("Heute kein Überschuss");
    expect(view.headline.de).toContain("schwach");
    expect(view.dateBerlin).toBe("2026-10-21");
    expect(view.fleetShare).toBeNull();
  });

  it("compares the evening peak with yesterday when today has no surplus and the gap is real", () => {
    const slots = quarters((hour) => [50_000 + (hour >= 18 && hour < 21 ? 20_000 : 0), 20_000, 5_000]);
    const yesterday = quarters(() => [50_000, 20_000, 5_000]);
    const view = buildHeuteImNetz({
      now,
      todayKey: "2026-10-21",
      today: day(slots),
      yesterday: day(yesterday, "2026-10-20"),
      fleet: null,
      hertzSharePct: null,
      dayAheadEurPerMwh: null,
    });
    expect(view.headline.de).toContain("Abendspitze");
    expect(view.headline.de).toContain("mehr als gestern");
    expect(view.figureUnit?.de).toBe("GW");
    expect(view.source.de).not.toContain("Battery Charts");
  });

  it("does not call the rest of a partial day already weak", () => {
    const slots = [slot(8, 0, 60_000, 8_000, 4_000), slot(9, 0, 60_000, 8_000, 4_000)];
    const view = buildHeuteImNetz({
      now,
      todayKey: "2026-10-21",
      today: day(slots),
      yesterday: null,
      fleet: null,
      hertzSharePct: null,
      dayAheadEurPerMwh: null,
    });
    expect(view.partial).toBe(true);
    expect(view.headline.de).toContain("Bis jetzt kein Überschuss");
    expect(view.axis.min).toBe(0);
  });

  it("stays empty rather than drawing a curve when today is unpublished", () => {
    const view = buildHeuteImNetz({
      now,
      todayKey: "2026-10-21",
      today: null,
      yesterday: null,
      fleet: null,
      hertzSharePct: null,
      dayAheadEurPerMwh: null,
    });
    expect(view.empty).toBe(true);
    expect(view.points).toHaveLength(0);
    expect(view.annotations).toHaveLength(0);
    expect(view.headline.de).toContain("noch nicht da");
  });
});
