import { assessConnectionGridBadge } from "@/lib/connectionGridBadge";
import {
  connectionBadge,
  fullUtilisationAssessment,
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

  it("computes the supermarket badge from the site plan", () => {
    const story = supermarketConnectionStory();
    expect(story.limitKw).toBe(90);
    expect(story.points.length).toBe(96);
    expect(story.peakBeforeKw).toBeGreaterThan(story.limitKw);
    expect(story.dischargedKwh).toBeGreaterThan(0);
    expect(story.chargedKwh).toBeGreaterThanOrEqual(0);
    expect(story.points.every((point) => point.soc >= 0 && point.soc <= 1)).toBe(true);
    const gridBadge = assessConnectionGridBadge({
      netKw: story.points.map((point) => point.ohneKw),
      chargeKw: story.points.map((point) => point.chargeKw),
      dischargeKw: story.points.map((point) => point.dischargeKw),
      limitKw: story.limitKw,
    });
    expect(gridBadge.id).toBe("netzdienlich");
    expect(JSON.stringify({ label: story.badge.label, peak: story.peakAfterKw })).not.toMatch(/€/);
  });
});
