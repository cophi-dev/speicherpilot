import { assessConnectionGridBadge } from "@/lib/connectionGridBadge";
import { GRID_SUPPORT_CONFIG } from "@/lib/sitePlanner";
import { supermarketConnectionStory } from "@/lib/siteConnectionDay";

describe("assessConnectionGridBadge", () => {
  it("reads 100 % discharge at peak utilisation as netzdienlich", () => {
    const badge = assessConnectionGridBadge({
      netKw: [100, 100, 95, 20],
      chargeKw: [0, 0, 0, 5],
      dischargeKw: [10, 10, 8, 0],
      limitKw: 100,
    });
    expect(badge.id).toBe("netzdienlich");
    expect(badge.dischargeShareInPeaks).toBeGreaterThanOrEqual(GRID_SUPPORT_CONFIG.supportiveMinShare);
  });

  it("reads 0 % peak share as neutral", () => {
    const badge = assessConnectionGridBadge({
      netKw: [10, 10, 10, 10],
      chargeKw: [0, 0, 0, 0],
      dischargeKw: [4, 4, 4, 4],
      limitKw: 100,
    });
    expect(badge.id).toBe("neutral");
  });

  it("marks exceeding connection capacity from charging as belastend", () => {
    const badge = assessConnectionGridBadge({
      netKw: [90, 90, 90, 90],
      chargeKw: [20, 0, 0, 0],
      dischargeKw: [0, 0, 0, 0],
      limitKw: 100,
    });
    expect(badge.id).toBe("belastend");
    expect(badge.exceedsLimit).toBe(true);
  });

  it("marks a new peak from charging as belastend", () => {
    const badge = assessConnectionGridBadge({
      netKw: [50, 50, 50, 50],
      chargeKw: [60, 0, 0, 0],
      dischargeKw: [0, 0, 0, 0],
      limitKw: 100,
    });
    expect(badge.id).toBe("belastend");
    expect(badge.createsNewPeak).toBe(true);
  });

  it("treats the supermarket fixture as netzdienlich at 90 kW", () => {
    const story = supermarketConnectionStory();
    const badge = assessConnectionGridBadge({
      netKw: story.points.map((point) => point.ohneKw),
      chargeKw: story.points.map((point) => point.chargeKw),
      dischargeKw: story.points.map((point) => point.dischargeKw),
      limitKw: 90,
    });
    expect(badge.id).toBe("netzdienlich");
    expect(badge.createsNewPeak).toBe(false);
    expect(badge.exceedsLimit).toBe(false);
  });

  it("reads exactly 60 % discharge at 90 % utilisation as netzdienlich", () => {
    const badge = assessConnectionGridBadge({
      netKw: [90, 90, 10, 10],
      chargeKw: [0, 0, 0, 0],
      dischargeKw: [6, 0, 4, 0],
      limitKw: 100,
    });
    expect(badge.dischargeShareInPeaks).toBeCloseTo(0.6, 5);
    expect(badge.id).toBe("netzdienlich");
  });

  it("reads 59.9 % peak discharge share as neutral", () => {
    const badge = assessConnectionGridBadge({
      netKw: [90, 90, 10, 10],
      chargeKw: [0, 0, 0, 0],
      dischargeKw: [5.99, 0, 4.01, 0],
      limitKw: 100,
    });
    expect(badge.dischargeShareInPeaks).toBeCloseTo(0.599, 3);
    expect(badge.id).toBe("neutral");
  });

  it("reads 0 % and 100 % connection utilisation thresholds", () => {
    expect(
      assessConnectionGridBadge({
        netKw: [5, 5, 5, 5],
        chargeKw: [0, 0, 0, 0],
        dischargeKw: [1, 1, 1, 1],
        limitKw: 100,
      }).id
    ).toBe("neutral");
    expect(
      assessConnectionGridBadge({
        netKw: [100, 100, 100, 100],
        chargeKw: [0, 0, 0, 0],
        dischargeKw: [10, 10, 10, 10],
        limitKw: 100,
      }).id
    ).toBe("netzdienlich");
  });

  it("marks feed-in beyond the limit as belastend", () => {
    const badge = assessConnectionGridBadge({
      netKw: [0, 0, 0, 0],
      chargeKw: [0, 0, 0, 0],
      dischargeKw: [0, 0, 0, 0],
      limitKw: 100,
      feedInLimitKw: 50,
    });
    const withExport = assessConnectionGridBadge({
      netKw: [-60, 0, 0, 0],
      chargeKw: [0, 0, 0, 0],
      dischargeKw: [0, 0, 0, 0],
      limitKw: 100,
      feedInLimitKw: 50,
    });
    expect(badge.exceedsLimit).toBe(false);
    expect(withExport.id).toBe("belastend");
    expect(withExport.exceedsLimit).toBe(true);
  });

  it("returns neutral with hint when limit is zero", () => {
    const badge = assessConnectionGridBadge({
      netKw: [200, 200],
      chargeKw: [0, 0],
      dischargeKw: [10, 10],
      limitKw: 0,
    });
    expect(badge.id).toBe("neutral");
    expect(badge.neutralHint).toBe("keine Anschlussleistung angegeben");
  });
});
