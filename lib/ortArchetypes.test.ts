import { assessBadgeV2, badgeForArchetype, loadOrtArchetypes, archetypeByKey } from "@/lib/ortArchetypes";

describe("ortArchetypes", () => {
  it("validates file schema", () => {
    const data = loadOrtArchetypes();
    const stadt = data.archetypes.stadt;
    expect(stadt.hasEngpass).toBe(false);
    expect(stadt.peakN1Pct).toBeGreaterThanOrEqual(0);
    expect(stadt.peakN1Pct).toBeLessThan(90);
    expect(stadt.xMw).not.toBeNull();
    expect(stadt.yMw).not.toBeNull();
    if (stadt.xMw != null && stadt.yMw != null) {
      expect(stadt.yMw).toBeGreaterThanOrEqual(stadt.xMw);
      expect(stadt.yMw).toBeCloseTo(1.1, 0);
    }
    const land = data.archetypes.land;
    if (land.hasEngpass) {
      expect(land.peakN1Pct).toBeGreaterThanOrEqual(90);
      expect(land.xMw).not.toBeNull();
      expect(land.yMw).not.toBeNull();
    } else {
      expect(land.xMw).toBeNull();
      expect(land.yMw).toBeNull();
    }
  });

  it("badge v2 neutral when C empty", () => {
    expect(assessBadgeV2({ L0n1: [10, 20], L1n1: [10, 20] }).id).toBe("neutral");
  });

  it("badge v2 ignores L1-only ≥90 qh for critical set and belastend", () => {
    const result = assessBadgeV2({
      L0n1: [8, 8, 12],
      L1n1: [115, 50, 20],
    });
    expect(result.id).toBe("neutral");
    expect(result.hint).toBe("kein Engpass an diesem Tag");
  });

  it("marks stadt archetype neutral without engpass even when L1 spikes from charging", () => {
    const stadt = archetypeByKey("stadt");
    for (const mode of ["markt", "vertrag", "netz"] as const) {
      expect(badgeForArchetype(stadt, mode).id).toBe("neutral");
      expect(badgeForArchetype(stadt, mode).hint).toBe("kein Engpass an diesem Tag");
    }
  });

  it("keeps land markt belastend when baseline n-1 already stressed", () => {
    expect(badgeForArchetype(archetypeByKey("land"), "markt").id).toBe("belastend");
  });

  it("revenue ordering on sample day", () => {
    const d = loadOrtArchetypes();
    expect(d.archetypes.land.revenuePctTyptag.markt).toBe(100);
    expect(d.archetypes.land.revenuePctTyptag.vertrag).toBeLessThanOrEqual(100);
    expect(d.archetypes.land.conflicts12m).toBeNull();
  });
});
