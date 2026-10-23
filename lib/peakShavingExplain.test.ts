import { HAMBURG_SUPERMARKET, hamburgSupermarketProfile } from "@/lib/hamburgSupermarket";
import { explainPeakShaving, gridImportKw, quartierTeachingDay, supermarketTeachingDay } from "@/lib/peakShavingExplain";
import { QUARTIER, quartierProfile } from "@/lib/quartierExample";

describe("supermarket teaching day", () => {
  const story = supermarketTeachingDay();
  const profile = hamburgSupermarketProfile().samplesKw.slice(0, 96);

  it("uses the winter weekday from the supermarket profile, with no extra PV", () => {
    expect(story.quarters.map((quarter) => quarter.loadKw)).toEqual(profile);
    profile.forEach((load, index) => {
      const hour = index / 4;
      let value =
        HAMBURG_SUPERMARKET.nightKw +
        (HAMBURG_SUPERMARKET.dayKw - HAMBURG_SUPERMARKET.nightKw) * Math.exp(-Math.pow((hour - 13) / 6, 2)) +
        HAMBURG_SUPERMARKET.peakBumpKw *
          Math.exp(-Math.pow((hour - HAMBURG_SUPERMARKET.peakHour) / HAMBURG_SUPERMARKET.peakWidthHours, 2));
      value *= 1.06;
      expect(load).toBeCloseTo(Math.max(8, value), 8);
    });
  });

  it("shaves the evening peak onto the 90 kW connection", () => {
    expect(story.peakHour).toBe(17.5);
    expect(story.peakBeforeKw).toBeCloseTo(119.608, 2);
    expect(story.peakAfterKw).toBeCloseTo(90, 4);
    expect(story.holdsLimit).toBe(true);
    expect(story.shavedKwh).toBeCloseTo(26.596, 2);
    expect(story.socMinPct).toBeCloseTo(27.88, 2);
    expect(story.quarters[story.quarters.length - 1]?.socKwh).toBeCloseTo(40, 4);
    expect(story.zoomFromHour).toBe(12);
    expect(story.zoomToHour).toBe(22);
    expect(story.demandChargeSavingEurPerYear).toBeCloseTo((story.peakBeforeKw - story.peakAfterKw) * 120, 6);
    expect(story.rechargeCapKw).toBe(15);
    const charges = story.quarters.filter((quarter) => quarter.batteryKw < 0);
    expect(charges.length).toBeGreaterThan(0);
    for (const quarter of charges) {
      expect(quarter.batteryKw).toBeGreaterThanOrEqual(-15 - 1e-9);
      expect(quarter.hour).toBeGreaterThanOrEqual(19.5);
      expect(quarter.netKw).toBeLessThanOrEqual(90 + 1e-6);
    }
  });
});

describe("quartier teaching day", () => {
  it("uses the neighbourhood battery and does not borrow the supermarket caps", () => {
    const loadKw = Array.from({ length: 96 }, (_, index) => {
      const hour = index / 4;
      if (hour >= 17 && hour < 19) {
        return 280;
      }
      if (hour >= 19.5) {
        return 40;
      }
      return 80;
    });
    const story = quartierTeachingDay(gridImportKw(loadKw, loadKw.map(() => 0)));
    expect(story.limitKw).toBe(QUARTIER.transformerKw);
    expect(story.powerKw).toBe(100);
    expect(story.energyKwh).toBe(100);
    expect(story.rechargeCapKw).toBe(100);
    expect(story.holdsLimit).toBe(false);
    expect(story.peakAfterKw).toBeGreaterThan(200);
    const charge = story.quarters.filter((quarter) => quarter.batteryKw < -90);
    expect(charge.length).toBeGreaterThan(0);
    for (const quarter of story.quarters) {
      expect(quarter.batteryKw).toBeLessThanOrEqual(100 + 1e-9);
      expect(quarter.batteryKw).toBeGreaterThanOrEqual(-100 - 1e-9);
      if (quarter.batteryKw < 0) {
        expect(quarter.netKw).toBeLessThanOrEqual(200 + 1e-6);
      }
    }
  });

  it("imports the neighbourhood day as load minus PV", () => {
    const day = quartierProfile().samplesKw.slice(0, 96);
    const pv = day.map((_, index) => (index >= 40 && index < 60 ? 30 : 0));
    const imported = gridImportKw(day, pv);
    expect(imported[48]).toBeCloseTo(Math.max(0, day[48] - 30), 6);
    const story = quartierTeachingDay(imported);
    expect(story.quarters[0]?.loadKw).toBeCloseTo(imported[0], 6);
    expect(story.powerKw).not.toBe(HAMBURG_SUPERMARKET.powerKw);
    expect(story.rechargeCapKw).not.toBe(15);
  });
});

describe("explainPeakShaving", () => {
  it("omits the euro figure when no demand charge is passed", () => {
    const story = explainPeakShaving({
      loadKw: [10, 50],
      limitKw: 40,
      powerKw: 20,
      energyKwh: 20,
      roundTripEfficiency: 0.9,
      demandChargeEurPerKwYear: null,
    });
    expect(story.demandChargeSavingEurPerYear).toBeNull();
  });
});
