import { paybackDomainMax, paybackLabelX } from "@/lib/chart-theme";
import {
  GRID_SUPPORT_CONFIG,
  assessGridSupport,
  classifyGridSupport,
  exampleProfile,
  illustrativeCommercialDay,
  loadBandsFor,
  manualAnnualProfile,
  parseLoadProfileCsv,
  percentile,
  planSite,
  pvPowerKw,
  sizeStorage,
  suggestVoltage,
  topQuarterHours,
  defaultPlannerEconomics,
  type LoadProfile,
  type SitePlannerInput,
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

  it("suggests a voltage band from requested power without treating it as a connection offer", () => {
    expect(suggestVoltage(135)).toMatchObject({ level: "NS", rule: "VDE-AR-N 4105" });
    expect(suggestVoltage(135.1)).toMatchObject({ level: "MS", rule: "VDE-AR-N 4110" });
    expect(suggestVoltage(20_000)).toMatchObject({ level: "MS", rule: "VDE-AR-N 4110" });
    expect(suggestVoltage(20_000.1)).toMatchObject({ level: "HS", rule: "VDE-AR-N 4120" });
    expect(suggestVoltage(20_000.1).href).toContain("vde.com");
  });

  it("keeps both operation modes on the same size and the same synthetic flag", () => {
    const market = planExample("gewerbe");
    const serving = planSite({ ...planExampleInput("gewerbe"), operation: "grid-serving" });
    expect(serving.powerKw).toBe(market.powerKw);
    expect(serving.energyKwh).toBe(market.energyKwh);
    expect(serving.assumptions.syntheticProfile).toBe(true);
    expect(serving.revenueStackingEur).toBeNull();
    expect(market.revenueStackingEur).toBeNull();
    expect(serving.transformerMeasured).toBe(false);
    expect(market.durationHours).toBeCloseTo(market.energyKwh / market.powerKw, 5);
  });

  it("lets market dispatch raise a flat site peak and keeps grid-serving from doing so", () => {
    const prices = [...new Array<number>(32).fill(10), ...new Array<number>(64).fill(280)];
    const shared = {
      ...planExampleInput("gewerbe"),
      profile: quarterHourProfile(new Array<number>(96).fill(300)),
      pvEnabled: false,
      pvKwp: 0,
      limitKw: 1000,
      dynamicTariff: true,
      priceEurPerMwh: prices,
      autoSize: false,
      manualPowerKw: 800,
      manualEnergyKwh: 2000,
    };
    const market = planSite({ ...shared, operation: "market" });
    const serving = planSite({ ...shared, operation: "grid-serving" });
    expect(market.importImpact).toBe("increases");
    expect(market.peakImportAfterKw).toBeGreaterThan(market.peakImportBeforeKw);
    expect(market.arbitrageEur).not.toBe(0);
    expect(serving.arbitrageEur).toBe(0);
    expect(serving.peakImportAfterKw).toBeLessThanOrEqual(serving.peakImportBeforeKw + 1e-6);
    expect(serving.importImpact).not.toBe("increases");
    expect(serving.revenueStackingEur).toBeNull();
  });

  it("reduces a peak in grid-serving mode and respects an import cap", () => {
    const samples = new Array<number>(96).fill(200);
    samples[40] = 1600;
    const serving = planSite({
      ...planExampleInput("gewerbe"),
      profile: quarterHourProfile(samples),
      pvEnabled: false,
      pvKwp: 0,
      limitKw: 1000,
      dynamicTariff: true,
      autoSize: false,
      manualPowerKw: 1500,
      manualEnergyKwh: 4000,
      operation: "grid-serving",
      importCapKw: 400,
    });
    expect(serving.peakImportAfterKw).toBeLessThan(serving.peakImportBeforeKw);
    expect(serving.gridImpact).toBe("reduces");
    expect(serving.peakImportAfterKw).toBeLessThanOrEqual(400 + 1e-3);
    expect(serving.capImportRespected).toBe(true);
    expect(serving.arbitrageEur).toBe(0);
  });

  it("caps export in the flexible-connection scenario and records curtailment", () => {
    const plan = planSite({
      ...planExampleInput("gewerbe"),
      profile: quarterHourProfile(new Array<number>(96).fill(0)),
      pvEnabled: true,
      pvKwp: 1,
      pvSeriesKw: new Array<number>(96).fill(400),
      limitKw: 1000,
      dynamicTariff: false,
      autoSize: false,
      manualPowerKw: 100,
      manualEnergyKwh: 500,
      operation: "grid-serving",
      exportCapKw: 50,
    });
    expect(plan.peakExportBeforeKw).toBeGreaterThan(50);
    expect(plan.peakExportAfterKw).toBeLessThanOrEqual(50 + 1e-3);
    expect(plan.capExportRespected).toBe(true);
    expect(plan.curtailmentKwh).toBeGreaterThan(0);
    expect(plan.assumptions.syntheticProfile).toBe(true);
  });

  it("discounts NPV with the same annual benefit and leaves stacking unpriced", () => {
    const base = planSite({ ...planExampleInput("gewerbe"), discountRate: 0 });
    const discounted = planSite({ ...planExampleInput("gewerbe"), discountRate: 0.08 });
    expect(base.revenueStackingEur).toBeNull();
    expect(base.npvEur).toBeCloseTo(-base.capexEur + base.annualBenefitEur * 15, 4);
    expect(discounted.npvEur).toBeLessThan(base.npvEur);
    expect(discounted.annualBenefitEur).toBeCloseTo(base.annualBenefitEur, 4);
    const rated = planSite({ ...planExampleInput("gewerbe"), transformerRatingKw: 2000 });
    expect(rated.transformerMeasured).toBe(false);
    expect(rated.transformerLoadBeforePct).toBeCloseTo(rated.gcpPeakBeforeKw / 2000, 5);
  });

  it("classifies grid support from the single provisional config", () => {
    const config = GRID_SUPPORT_CONFIG;
    expect(config.supportiveMinShare).toBe(0.6);
    expect(config.peakUtilisation).toBe(0.9);
    expect(classifyGridSupport(0.6, false)).toBe("supportive");
    expect(classifyGridSupport(0.59, false)).toBe("mixed");
    expect(classifyGridSupport(0.3, false)).toBe("mixed");
    expect(classifyGridSupport(0.29, false)).toBe("market");
    expect(classifyGridSupport(0.9, true)).toBe("new-peak");

    const peakWindow = assessGridSupport({
      loadKw: [1000, 1000, 400, 400],
      chargeKw: [0, 0, 100, 0],
      dischargeKw: [200, 100, 0, 0],
      gridKw: [800, 900, 500, 400],
      netKw: [1000, 1000, 400, 400],
      limitKw: 1000,
      intervalHours: 0.25,
    });
    expect(peakWindow.createsNewPeak).toBe(false);
    expect(peakWindow.dischargeShareInPeaks).toBeCloseTo(1, 5);
    expect(peakWindow.status).toBe("supportive");

    const raised = assessGridSupport({
      loadKw: [950, 100],
      chargeKw: [0, 400],
      dischargeKw: [200, 0],
      gridKw: [750, 500],
      netKw: [400, 100],
      limitKw: 1000,
      intervalHours: 0.25,
    });
    expect(raised.createsNewPeak).toBe(true);
    expect(raised.status).toBe("new-peak");
  });

  it("splits charge and discharge into load bands and ranks the top quarter-hours", () => {
    const bands = loadBandsFor({
      loadKw: [100, 600, 800, 950],
      chargeKw: [10, 0, 0, 0],
      dischargeKw: [0, 20, 30, 40],
      limitKw: 1000,
      intervalHours: 1,
    });
    expect(bands.map((band) => band.id)).toEqual(["below50", "50to75", "75to90", "above90"]);
    expect(bands[0]?.chargeKwh).toBeCloseTo(10, 5);
    expect(bands[3]?.dischargeKwh).toBeCloseTo(40, 5);
    const top = topQuarterHours({
      loadKw: [10, 50, 40, 90],
      chargeKw: [0, 0, 0, 5],
      dischargeKw: [0, 8, 0, 0],
      gridKw: [10, 42, 40, 95],
      intervalMinutes: 15,
      count: 2,
    });
    expect(top.map((slot) => slot.index)).toEqual([3, 1]);
    expect(top[1]?.bessKw).toBeCloseTo(8, 5);
  });

  it("places the payback label to the right of the break-even line and clear of the y axis", () => {
    expect(paybackLabelX(120, 64)).toBe(128);
    expect(paybackLabelX(20, 64)).toBe(72);
    expect(paybackLabelX(64, 64)).toBeGreaterThanOrEqual(64 + 8);
    expect(paybackLabelX(120, 64, 8, 308, 137)).toBe(128);
    expect(paybackLabelX(300, 64, 8, 308, 137)).toBe(308 - 137);
    expect(paybackLabelX(300, 64, 8, 308, 137)).toBeGreaterThanOrEqual(64 + 8);
    expect(paybackDomainMax(15, 13.7, 800, 153)).toBeGreaterThan(15);
    expect(paybackDomainMax(15, 13.7, 800, 153)).toBeLessThan(20);
    expect(paybackDomainMax(15, 13.7, 244, 153)).toBe(15);
    expect(paybackDomainMax(15, 7.8, 300, 140)).toBe(15);
  });
});

function quarterHourProfile(samplesKw: number[]): LoadProfile {
  return {
    samplesKw,
    intervalMinutes: 15,
    synthetic: true,
    label: "Testprofil",
    sourceNote: "BEISPIELDATEN · Test, nicht gemessen",
    rowCount: samplesKw.length,
    gapCount: 0,
    interpolatedGaps: 0,
    warnings: [],
  };
}

function planExampleInput(kind: "gewerbe" | "kuehlhaus" | "ladepark"): SitePlannerInput {
  const economics = defaultPlannerEconomics();
  return {
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
  };
}
