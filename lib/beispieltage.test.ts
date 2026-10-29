import { dispatchReferencePark } from "@/lib/referenceParkModelDay";
import { publicCopyIssues } from "@/lib/readability";
import {
  berlinClock,
  beispieltage,
  breakdownText,
  dayAheadPoints,
  displayEuro,
  EURO_SCOPE,
  HINTS,
  fleetEuroHiddenHint,
  liveResultLabel,
  loadBeispieltage,
  showsFleetEuroRevenue,
  thousandsLabel,
} from "@/lib/beispieltage";
import { berlinWeekdayName } from "@/lib/beispieltageBuild";
import { ROUND_TRIP_EFFICIENCY } from "@/lib/roundTripEfficiency";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function at(dateBerlin: string, clock: string): { price: number; power: number } {
  const day = beispieltage.days.find((item) => item.dateBerlin === dateBerlin);
  if (!day) {
    throw new Error(dateBerlin);
  }
  const index = day.slotStartIso.findIndex((iso) => berlinClock(iso) === clock);
  if (index < 0) {
    throw new Error(`${dateBerlin} ${clock}`);
  }
  return { price: day.prices[index] ?? Number.NaN, power: day.dispatch.powerMw[index] ?? Number.NaN };
}

describe("fleet euro display", () => {
  it("shows euro revenue only at ×1", () => {
    expect(showsFleetEuroRevenue(1)).toBe(true);
    expect(showsFleetEuroRevenue(2)).toBe(false);
    expect(showsFleetEuroRevenue(5)).toBe(false);
    expect(showsFleetEuroRevenue(10)).toBe(false);
  });

  it("keeps ×1 display rounding and hides scaled amounts in labels", () => {
    const day = beispieltage.days[0]!;
    expect(displayEuro(day.revenueEur.x1, 1)).toBe(67000);
    expect(liveResultLabel(day, 1, "de")).toContain("67.000");
    expect(liveResultLabel(day, 1, "de")).toContain("Modellschätzung");
    expect(liveResultLabel(day, 5, "de")).not.toMatch(/Modellerlös|67\.000/);
    expect(liveResultLabel(day, 5, "de")).toContain(fleetEuroHiddenHint("de"));
    expect(breakdownText(day, 5, "de")).toBe(fleetEuroHiddenHint("de"));
  });
});

describe("beispieltage data", () => {
  it("matches the schema, the source and the weekdays", () => {
    const file = loadBeispieltage();
    expect(file.schemaVersion).toBe(1);
    expect(file.retrievedIso).toBe("2026-10-27");
    expect(file.sources.prices.licence).toContain("CC BY 4.0");
    expect(file.sources.prices.name).toContain("SMARD.de");
    expect(file.days).toHaveLength(4);
    expect(new Set(file.days.map((day) => day.id)).size).toBe(4);
    expect(new Set(file.days.map((day) => day.role)).size).toBe(4);
    expect(file.park.roundTrip).toBe(ROUND_TRIP_EFFICIENCY);
    for (const day of file.days) {
      expect(day.weekday).toBe(berlinWeekdayName(day.dateBerlin, "de"));
      const length = day.prices.length;
      expect([92, 96, 100]).toContain(length);
      expect(day.slotStartIso).toHaveLength(length);
      expect(day.dispatch.powerMw).toHaveLength(length);
      expect(day.dispatch.socPct).toHaveLength(length);
      expect(day.textEn.title.length).toBeGreaterThan(0);
      expect(day.textEn.why.length).toBeGreaterThan(0);
      expect(publicCopyIssues(day.textDe.title)).toEqual([]);
      expect(publicCopyIssues(day.textDe.why)).toEqual([]);
    }
    expect(publicCopyIssues(file.selectionRule.de)).toEqual([]);
    expect(publicCopyIssues(EURO_SCOPE.de)).toEqual([]);
    for (const hint of HINTS) {
      expect(publicCopyIssues(hint.de)).toEqual([]);
      expect(hint.en.length).toBeGreaterThan(0);
    }
    expect(EURO_SCOPE.de).toContain("×1");
    expect(EURO_SCOPE.de).toContain("Modellschätzung");
    expect(EURO_SCOPE.de).not.toMatch(/nur im aufklappbaren/);
    expect(file.selectionRule.de).toContain("Der beste Herbsttag");
    expect(file.selectionRule.de).not.toMatch(/jüngste/);
    expect(file.selectionRule.en).toContain("best autumn day");
    expect(file.counterExample?.textDe).toContain("21:00");
    expect(file.counterExample?.textDe).not.toMatch(/Abendpreis/);
    expect(file.counterExample?.textDe).toContain("zwischen −15 und 36 €/MWh");
    expect(file.counterExample?.textEn).not.toMatch(/€\d/);
    expect(file.counterExample?.textEn).toContain("€/MWh\u00a0at");
  });

  it("puts fees next to the charging euros and keeps one euro style", () => {
    const paid = beispieltage.days[0]!;
    const costly = beispieltage.days[1]!;
    expect(breakdownText(paid, 1, "de")).toMatch(/vom Laden: rund [\d.]+ €, ohne Netzentgelte, Umlagen, Steuern/);
    expect(breakdownText(costly, 1, "de")).toContain("ohne Netzentgelte, Umlagen, Steuern");
    expect(breakdownText(paid, 1, "en")).toContain("without grid fees, levies and taxes");
    expect(breakdownText(paid, 1, "en")).not.toMatch(/€\d/);
    expect(thousandsLabel(paid.revenueEur.x1, "de")).toBe("67 Tsd. €");
    expect(thousandsLabel(paid.revenueEur.x1, "en")).toBe("67k €");
    expect(thousandsLabel(paid.revenueEur.x1, "en")).not.toMatch(/€\d/);
  });

  it("recomputes each day with the repository core", () => {
    for (const day of beispieltage.days) {
      const result = dispatchReferencePark({
        prices: dayAheadPoints(day),
        dateBerlin: day.dateBerlin,
        powerMw: 103.5,
        energyMwh: 238.5,
      });
      expect(result).not.toBeNull();
      expect(Math.abs((result?.economics.grossRevenueEur ?? 0) - day.revenueEur.x1)).toBeLessThanOrEqual(0.5);
      result?.powerDispatchMw.forEach((value, index) => {
        expect(Math.abs(value - (day.dispatch.powerMw[index] ?? 0))).toBeLessThanOrEqual(1e-6);
      });
      result?.socPct.forEach((value, index) => {
        expect(Math.abs(value - (day.dispatch.socPct[index] ?? 0))).toBeLessThanOrEqual(1e-6);
      });
    }
  });

  it("recomputes 1 May 2026 by hand", () => {
    const quarter = round2(103.5 * 0.25 * 499.99);
    expect(quarter).toBe(12937.24);
    expect(at("2026-05-01", "13:15").price).toBeCloseTo(-499.99, 2);
    expect(at("2026-05-01", "13:15").power).toBeCloseTo(-103.5, 3);
    expect(at("2026-05-01", "13:30").power).toBeCloseTo(-103.5, 3);
    expect(at("2026-05-01", "13:45").power).toBeCloseTo(-103.5, 3);
    const lastCharge = Math.abs(at("2026-05-01", "14:00").power);
    expect(lastCharge).toBeCloseTo(103.403, 3);
    const lastCash = round2(lastCharge * 0.25 * 499.99);
    expect(lastCash).toBe(12925.16);
    expect(round2(quarter * 3 + lastCash)).toBe(51736.88);

    const delivered = 25.875;
    expect(at("2026-05-01", "18:45").price).toBeCloseTo(176.26, 2);
    expect(at("2026-05-01", "19:45").price).toBeCloseTo(232.99, 2);
    expect(at("2026-05-01", "20:00").price).toBeCloseTo(180.71, 2);
    expect(Math.abs(at("2026-05-01", "18:45").power) * 0.25).toBeCloseTo(delivered, 3);
    const evening = round2(delivered * 176.26) + round2(delivered * 232.99) + round2(delivered * 180.71);
    expect(round2(delivered * 176.26)).toBe(4560.73);
    expect(round2(delivered * 232.99)).toBe(6028.62);
    expect(round2(delivered * 180.71)).toBe(4675.87);
    expect(round2(evening)).toBe(15265.22);
    expect(round2(51736.88 + 15265.22)).toBe(67002.1);

    const day = beispieltage.days[0]!;
    expect(day.parts.chargingEur).toBe(51736.88);
    expect(day.parts.dischargingEur).toBe(15265.22);
    expect(day.revenueEur.x1).toBeCloseTo(67002.1, 2);
    const root = Math.sqrt(0.85);
    expect(day.chargedFromGridMwh).toBeCloseTo(103.476, 3);
    expect(day.chargedFromGridMwh * root).toBeCloseTo(95.4, 1);
    expect(day.dischargedToGridMwh).toBeCloseTo(77.625, 3);
    expect(day.dischargedToGridMwh / root).toBeCloseTo(84.2, 1);
    expect(day.dispatch.socPct.at(-1) ?? 0).toBeCloseTo(54.7, 1);
  });

  it("matches the other hand totals within two cents", () => {
    const expectParts = (dateBerlin: string, charging: number, discharging: number, total: number) => {
      const day = beispieltage.days.find((item) => item.dateBerlin === dateBerlin);
      expect(day?.parts.chargingEur).toBeCloseTo(charging, 2);
      expect(day?.parts.dischargingEur).toBeCloseTo(discharging, 2);
      expect(Math.abs((day?.parts.chargingEur ?? 0) + (day?.parts.dischargingEur ?? 0) - total)).toBeLessThanOrEqual(0.02);
    };
    expectParts("2026-06-24", -6852.45, 55555.95, 48703.51);
    expectParts("2026-09-14", -15937.65, 55375.61, 39437.95);
    expectParts("2026-04-14", -10614.01, 20957.97, 10343.96);
  });

  it("keeps the state of charge, the power and the linear scales inside the model", () => {
    for (const day of beispieltage.days) {
      for (const soc of day.dispatch.socPct) {
        expect(soc).toBeGreaterThanOrEqual(10 - 1e-6);
        expect(soc).toBeLessThanOrEqual(90 + 1e-6);
      }
      for (const power of day.dispatch.powerMw) {
        expect(Math.abs(power)).toBeLessThanOrEqual(103.5 + 1e-6);
      }
      expect(day.dispatch.socPct.at(-1) ?? 0).toBeGreaterThanOrEqual(50 - 1e-6);
      expect(Math.abs(day.parts.chargingEur + day.parts.dischargingEur - day.revenueEur.x1)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(day.revenueEur.x2 - day.revenueEur.x1 * 2)).toBeLessThan(1e-9);
      expect(Math.abs(day.revenueEur.x5 - day.revenueEur.x1 * 5)).toBeLessThan(1e-9);
      expect(Math.abs(day.revenueEur.x10 - day.revenueEur.x1 * 10)).toBeLessThan(1e-9);
    }
  });
});
