import { buildDayClock, clockRadius, clockRings, clockRuns, formatClockHours, type ClockSample } from "@/lib/dayClock";
import type { ResidualSlot } from "@/lib/windSolarResidual";

function slot(hour: number, minute: number, loadMw: number, windMw: number, solarMw: number): ResidualSlot {
  return {
    timestampIso: "2026-10-21T10:00:00.000Z",
    hourBerlin: hour,
    minuteBerlin: minute,
    loadMw,
    windMw,
    solarMw,
  };
}

function daySlots(mutate: (hour: number, minute: number) => [number, number, number]): ResidualSlot[] {
  const slots: ResidualSlot[] = [];
  for (let index = 0; index < 96; index += 1) {
    const hour = Math.floor(index / 4);
    const minute = (index % 4) * 15;
    const [loadMw, windMw, solarMw] = mutate(hour, minute);
    slots.push(slot(hour, minute, loadMw, windMw, solarMw));
  }
  return slots;
}

const fleet = { energyGwh: 7.86, updatedLabel: { de: "21. Oktober 2026", en: "21 October 2026" } };

describe("clock geometry", () => {
  it("scales radius with area, not with a linear radius", () => {
    const hole = 14;
    const outer = 100;
    expect(clockRadius(0, 40, hole, outer)).toBeCloseTo(hole, 6);
    expect(clockRadius(40, 40, hole, outer)).toBeCloseTo(outer, 6);
    const half = clockRadius(20, 40, hole, outer);
    const linearMidpoint = hole + 0.5 * (outer - hole);
    expect(half).toBeCloseTo(Math.sqrt(hole * hole + 0.5 * (outer * outer - hole * hole)), 6);
    expect(Math.abs(half - linearMidpoint)).toBeGreaterThan(5);
  });

  it("labels 20 and 40 GW, then further steps only inside the day's maximum", () => {
    expect(clockRings(70)).toEqual([20, 40, 60]);
    expect(clockRings(40)).toEqual([20, 40]);
    expect(clockRings(39)).toEqual([20]);
    expect(clockRings(15)).toEqual([]);
  });

  it("does not draw a run across a missing quarter-hour", () => {
    const samples: ClockSample[] = [
      { hour: 0, loadGw: 50, windSolarGw: 20, surplus: false },
      { hour: 0.25, loadGw: 50, windSolarGw: 20, surplus: false },
      { hour: 1, loadGw: 50, windSolarGw: 20, surplus: false },
    ];
    expect(clockRuns(samples)).toHaveLength(2);
  });
});

describe("buildDayClock", () => {
  it("formats quarter-hours without rounding 2,25 down to one decimal", () => {
    expect(formatClockHours(2.25, "de")).toBe("2,25");
    expect(formatClockHours(2.5, "de")).toBe("2,5");
    expect(formatClockHours(8, "en")).toBe("8");
  });

  it("keeps today when there is no surplus and closes the midnight seam on a full day", () => {
    const view = buildDayClock({
      dateBerlin: "2026-10-21",
      slots: daySlots(() => [72000, 8000, 2000]),
      fleet,
    });
    expect(view.partial).toBe(false);
    expect(view.closeMidnight).toBe(true);
    expect(view.surplusHours).toBe(0);
    expect(view.surplusGwh).toBe(0);
    expect(view.headline.de).toBe("Heute kein Überschuss.");
    expect(view.headline.en).toBe("No surplus today.");
    expect(view.dateBerlin).toBe("2026-10-21");
    expect(view.fleetShare).toBeNull();
    expect(view.maxGw).toBeCloseTo(72, 4);
    expect(view.ringGw).toEqual([20, 40, 60]);
    expect(view.source.de).toContain("Energy-Charts");
    expect(view.source.de).toContain("21. Oktober 2026");
    expect(view.source.de).toContain("Battery Charts");
    expect(view.source.de.toLowerCase()).not.toContain("hamburg");
    expect(view.samples).toHaveLength(96);
  });

  it("says so far on a partial day and does not close unpublished hours", () => {
    const slots = [slot(0, 0, 60000, 5000, 1000), slot(0, 15, 61000, 5000, 1000)];
    const view = buildDayClock({ dateBerlin: "2026-10-21", slots, fleet: null });
    expect(view.partial).toBe(true);
    expect(view.closeMidnight).toBe(false);
    expect(view.headline.de).toBe("Bis jetzt kein Überschuss.");
    expect(view.source.de).not.toContain("Battery Charts");
  });

  it("counts surplus hours and energy from published quarter-hours only", () => {
    const slots = daySlots((hour) => (hour >= 8 && hour < 16 ? [50000, 40000, 20000] : [60000, 10000, 5000]));
    const view = buildDayClock({ dateBerlin: "2026-10-21", slots, fleet });
    expect(view.surplusHours).toBe(8);
    expect(view.surplusGwh).toBeCloseTo(80, 6);
    expect(view.fleetShare).toBeCloseTo(7.86 / view.surplusGwh, 6);
    expect(view.headline.de).toBe("8 Stunden lang mehr Wind und Sonne als der Verbrauch.");
    expect(view.surplusRun).toEqual({ fromHour: 8, toHour: 16 });
    expect(view.closeMidnight).toBe(true);
  });

  it("closes midnight even when a midday quarter is missing, without joining that gap", () => {
    const slots = daySlots(() => [50000, 10000, 0]).filter((entry) => !(entry.hourBerlin === 12 && entry.minuteBerlin === 0));
    const view = buildDayClock({ dateBerlin: "2026-10-21", slots, fleet: null });
    expect(view.closeMidnight).toBe(true);
    expect(view.partial).toBe(true);
    expect(clockRuns(view.samples).length).toBe(2);
    expect(view.headline.de).toBe("Bis jetzt kein Überschuss.");
  });

  it("says the quarter-hours are not in yet when today is empty", () => {
    const view = buildDayClock({ dateBerlin: "2026-10-21", slots: [], fleet: null });
    expect(view.empty).toBe(true);
    expect(view.headline.de).toBe("Die Viertelstunden von heute sind noch nicht da.");
    expect(view.samples).toHaveLength(0);
    expect(view.closeMidnight).toBe(false);
  });

  it("uses a partial surplus headline and does not borrow another day", () => {
    const slots = [slot(10, 0, 40000, 30000, 20000), slot(10, 15, 40000, 30000, 20000)];
    const view = buildDayClock({ dateBerlin: "2026-10-21", slots, fleet });
    expect(view.surplusHours).toBe(0.5);
    expect(view.headline.de).toBe("Bis jetzt 0,5 Stunden lang mehr Wind und Sonne als der Verbrauch.");
    expect(view.dateBerlin).toBe("2026-10-21");
  });
});
