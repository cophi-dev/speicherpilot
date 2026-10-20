import {
  exampleProfile,
  illustrativeCommercialDay,
  manualAnnualProfile,
  parseLoadProfileCsv,
  percentile,
  planSite,
  pvPowerKw,
  sizeStorage,
  defaultPlannerEconomics,
} from "@/lib/sitePlanner";

function planExample(kind: "gewerbe" | "kuehlhaus" | "ladepark" = "gewerbe") {
  const economics = defaultPlannerEconomics();
  return planSite({
    profile: exampleProfile(kind),
    pvEnabled: true,
    pvKwp: economics.pvKwp,
    pvOrientation: "south",
    limitKw: economics.limitKw,
    voltage: economics.voltage,
    demandChargeEurPerKwYear: economics.demandChargeEurPerKwYear,
    energyPriceCtPerKwh: economics.energyPriceCtPerKwh,
    feedInCtPerKwh: economics.feedInCtPerKwh,
    dynamicTariff: true,
    autoSize: true,
    manualPowerKw: 0,
    manualEnergyKwh: 0,
    roundTripEfficiency: economics.roundTripEfficiency,
    capexEurPerKwh: economics.capexEurPerKwh,
    maxCyclesPerYear: economics.maxCyclesPerYear,
    lifetimeYears: economics.lifetimeYears,
    discountRate: 0,
  });
}

describe("sitePlanner", () => {
  it("parses a 15-min kW csv and interpolates a short gap", () => {
    const csv = [
      "timestamp,kW",
      "2025-01-01T00:00:00Z,100",
      "2025-01-01T00:15:00Z,110",
      "2025-01-01T00:45:00Z,130",
      "2025-01-01T01:00:00Z,140",
    ].join("\n");
    const parsed = parseLoadProfileCsv(csv);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.profile.synthetic).toBe(false);
    expect(parsed.profile.intervalMinutes).toBe(15);
    expect(parsed.profile.samplesKw).toHaveLength(5);
    expect(parsed.profile.interpolatedGaps).toBe(1);
    expect(parsed.profile.samplesKw[2]).toBeCloseTo(120, 5);
  });

  it("rejects an unsupported interval", () => {
    const csv = ["timestamp,kW", "2025-01-01T00:00:00Z,10", "2025-01-01T00:05:00Z,11", "2025-01-01T00:10:00Z,12", "2025-01-01T00:15:00Z,13"].join("\n");
    const parsed = parseLoadProfileCsv(csv);
    expect(parsed.ok).toBe(false);
  });

  it("converts kWh per interval into kW", () => {
    const csv = ["kWh", "10", "10", "10", "10"].join("\n");
    const parsed = parseLoadProfileCsv(csv);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.profile.samplesKw[0]).toBeCloseTo(40, 5);
  });

  it("sizes storage from the P95 daily excess", () => {
    const net = new Array<number>(96 * 3).fill(100);
    net[10] = 1500;
    net[96 + 20] = 1400;
    net[192 + 30] = 1300;
    const sized = sizeStorage({
      netKw: net,
      limitKw: 1000,
      intervalMinutes: 15,
      roundTripEfficiency: 0.9,
    });
    expect(sized.powerKw).toBeGreaterThan(0);
    expect(sized.energyKwh).toBeGreaterThan(0);
  });

  it("labels example profiles as synthetic and shaves a commercial peak", () => {
    const profile = exampleProfile("gewerbe");
    expect(profile.synthetic).toBe(true);
    expect(profile.samplesKw).toHaveLength(365 * 96);
    expect(profile.sourceNote).toMatch(/BEISPIELDATEN/);
    const plan = planExample("gewerbe");
    expect(plan.assumptions.syntheticProfile).toBe(true);
    expect(plan.assumptions.syntheticPv).toBe(true);
    expect(plan.assumptions.syntheticPrices).toBe(true);
    expect(plan.powerKw).toBeGreaterThan(0);
    expect(plan.energyKwh).toBeGreaterThan(0);
    expect(plan.peakImportAfterKw).toBeLessThan(plan.peakImportBeforeKw);
    expect(plan.exceedanceHoursAfter).toBeLessThan(plan.exceedanceHoursBefore);
    expect(plan.capexEur).toBeCloseTo(plan.energyKwh * 500, 5);
    expect(Number.isFinite(plan.annualBenefitEur)).toBe(true);
    expect(plan.checks.importWithinLimit).toBe(plan.connection !== "over");
  });

  it("flags an undersized battery as over the connection limit", () => {
    const economics = defaultPlannerEconomics();
    const plan = planSite({
      profile: exampleProfile("ladepark"),
      pvEnabled: false,
      pvKwp: 0,
      pvOrientation: "south",
      limitKw: 400,
      voltage: "NS",
      demandChargeEurPerKwYear: economics.demandChargeEurPerKwYear,
      energyPriceCtPerKwh: economics.energyPriceCtPerKwh,
      feedInCtPerKwh: economics.feedInCtPerKwh,
      dynamicTariff: false,
      autoSize: false,
      manualPowerKw: 10,
      manualEnergyKwh: 20,
      roundTripEfficiency: 0.9,
      capexEurPerKwh: 500,
      maxCyclesPerYear: 400,
      lifetimeYears: 15,
      discountRate: 0,
    });
    expect(plan.connection).toBe("over");
    expect(plan.checks.importWithinLimit).toBe(false);
    expect(plan.assumptions.syntheticPrices).toBe(false);
  });

  it("scales a manual annual profile to the requested consumption", () => {
    const profile = manualAnnualProfile("G0", 500_000);
    const kwh = profile.samplesKw.reduce((sum, kw) => sum + kw, 0) * 0.25;
    expect(profile.synthetic).toBe(true);
    expect(kwh).toBeCloseTo(500_000, -1);
  });

  it("keeps the illustrative commercial day under the limit with the fixed 620 kWh pack", () => {
    const { plan, profile } = illustrativeCommercialDay();
    expect(profile.synthetic).toBe(true);
    expect(plan.powerKw).toBe(310);
    expect(plan.energyKwh).toBe(620);
    expect(plan.peakImportBeforeKw).toBeGreaterThan(1000);
    expect(plan.peakImportAfterKw).toBeLessThanOrEqual(1000 + 1);
    expect(plan.peakDay.loadKw).toHaveLength(96);
  });

  it("puts south PV yield in a documented band", () => {
    let kwh = 0;
    for (let day = 0; day < 365; day += 1) {
      for (let step = 0; step < 96; step += 1) {
        kwh += pvPowerKw({ dayIndex: day, hour: step / 4, kwp: 1, orientation: "south" }) * 0.25;
      }
    }
    expect(kwh).toBeGreaterThan(800);
    expect(kwh).toBeLessThan(1100);
  });

  it("computes an interpolated percentile", () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5, 5);
  });
});
