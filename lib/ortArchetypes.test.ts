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

  it("badge v2 neutral when baseline has no stress and no global damage", () => {
    expect(assessBadgeV2({ L0n1: [10, 20], L1n1: [10, 20] }).id).toBe("neutral");
  });

  it("badge v2 belastend on new overload without baseline stress", () => {
    expect(
      assessBadgeV2({
        L0n1: [8, 8, 12],
        L1n1: [115, 50, 20],
      }).id,
    ).toBe("belastend");
  });

  it("badge v2 belastend on relief-in-stress plus new overload outside", () => {
    expect(assessBadgeV2({ L0n1: [95, 20], L1n1: [90, 110] }).id).toBe("belastend");
  });

  it("badge v2 netzdienlich on synthetic relief without extra damage", () => {
    expect(assessBadgeV2({ L0n1: [95, 92, 50], L1n1: [90, 88, 50] }).id).toBe("netzdienlich");
  });

  it("badge v2 not assessed on non-finite values", () => {
    const result = assessBadgeV2({ L0n1: [95, Number.NaN], L1n1: [90, Number.NaN] });
    expect(result.id).toBe("neutral");
    expect(result.hint).toMatch(/nicht bewertet/);
  });

  it("badge v2 not assessed on unequal lengths", () => {
    const result = assessBadgeV2({ L0n1: [95], L1n1: [90, 130] });
    expect(result.id).toBe("neutral");
    expect(result.hint).toMatch(/ungleich lang/);
  });

  it("typtag badges: five market/contract modes belastend, stadt netz neutral without new overload", () => {
    for (const key of ["land", "stadt"] as const) {
      const arch = archetypeByKey(key);
      for (const mode of ["markt", "vertrag", "netz"] as const) {
        const id = badgeForArchetype(arch, mode).id;
        if (key === "stadt" && mode === "netz") {
          expect(id).toBe("neutral");
        } else {
          expect(id).toBe("belastend");
        }
      }
    }
  });

  it("revenue ordering on sample day", () => {
    const d = loadOrtArchetypes();
    expect(d.archetypes.land.revenuePctTyptag.markt).toBe(100);
    expect(d.archetypes.land.revenuePctTyptag.vertrag).toBeLessThanOrEqual(100);
    expect(d.archetypes.land.conflicts12m).toBeNull();
  });
});
