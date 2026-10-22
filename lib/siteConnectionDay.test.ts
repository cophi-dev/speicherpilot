import { supermarketTeachingDay } from "@/lib/peakShavingExplain";
import {
  connectionBadge,
  fullUtilisationAssessment,
  middayMeanKw,
  supermarketConnectionStory,
  zeroUtilisationAssessment,
} from "@/lib/siteConnectionDay";

describe("site connection day", () => {
  it("reads 0 % utilisation as not met, without a red failure", () => {
    const badge = connectionBadge(zeroUtilisationAssessment());
    expect(badge.dischargeShare).toBe(0);
    expect(badge.met).toBe(false);
    expect(badge.label).toBe("nicht erfüllt");
  });

  it("reads 100 % of discharge in the peak windows as netzdienlich v1", () => {
    const assessment = fullUtilisationAssessment();
    expect(assessment.dischargeShareInPeaks).toBeCloseTo(1, 6);
    expect(assessment.createsNewPeak).toBe(false);
    const badge = connectionBadge(assessment);
    expect(badge.met).toBe(true);
    expect(badge.label).toBe("netzdienlich");
  });

  it("uses the homepage teaching day for the supermarket, starting full", () => {
    const day = supermarketTeachingDay();
    const story = supermarketConnectionStory();
    expect(story.limitKw).toBe(day.limitKw);
    expect(story.powerKw).toBe(day.powerKw);
    expect(story.energyKwh).toBe(day.energyKwh);
    expect(story.rte).toBe(day.roundTripEfficiency);
    expect(story.points).toHaveLength(day.quarters.length);
    expect(story.peakBeforeKw).toBeCloseTo(day.peakBeforeKw, 6);
    expect(story.peakAfterKw).toBeCloseTo(day.peakAfterKw, 6);
    expect(story.dischargedKwh).toBeCloseTo(day.shavedKwh, 6);
    expect(story.points[0]?.soc).toBeCloseTo(1, 5);
    const lowest = story.points.reduce((best, point) => (point.soc < best.soc ? point : best));
    expect(lowest.soc * story.energyKwh).toBeCloseTo(day.socMinKwh, 5);
    expect(lowest.hour).toBeCloseTo(day.quarters.reduce((best, quarter) => (quarter.socKwh < best.socKwh ? quarter : best)).hour, 5);
    expect(story.points.every((point) => point.soc >= 0 && point.soc <= 1)).toBe(true);
    expect(["netzdienlich", "nicht erfüllt"]).toContain(story.badge.label);
    expect(JSON.stringify({ label: story.badge.label, peak: story.peakAfterKw })).not.toMatch(/€/);
  });

  it("reads midday import as the 12:00–14:00 mean, not the night minimum", () => {
    const story = supermarketConnectionStory();
    const night = story.points.reduce((best, point) => (point.ohneKw < best.ohneKw ? point : best));
    const window = story.points.filter((point) => point.hour >= 12 && point.hour < 14);
    const mean = window.reduce((sum, point) => sum + point.ohneKw, 0) / window.length;
    expect(window.length).toBe(8);
    expect(night.hour).toBe(0);
    expect(mean).toBeGreaterThan(25);
    expect(mean).toBeLessThan(35);
    expect(middayMeanKw(story.points)).toBeCloseTo(mean, 6);
    expect(mean).toBeGreaterThan(night.ohneKw + 5);
  });
});
