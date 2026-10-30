import { assessConnectionGridBadge } from "@/lib/connectionGridBadge";
import { GRID_SUPPORT_CONFIG } from "@/lib/sitePlanner";

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

  it("marks exceeding connection capacity as belastend", () => {
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

  it("matches sitePlanner fixtures at the 60/90 thresholds", () => {
    expect(assessConnectionGridBadge({
      netKw: [100, 100, 95, 20],
      chargeKw: [0, 0, 0, 5],
      dischargeKw: [10, 10, 8, 0],
      limitKw: 100,
    }).id).toBe("netzdienlich");
    expect(assessConnectionGridBadge({
      netKw: [10, 10, 10, 10],
      chargeKw: [0, 0, 0, 0],
      dischargeKw: [4, 4, 4, 4],
      limitKw: 100,
    }).id).toBe("neutral");
  });
});
