import { assessBadgeV2, loadOrtArchetypes } from "@/lib/ortArchetypes";

describe("ortArchetypes", () => {
  it("validates file schema", () => {
    const data = loadOrtArchetypes();
    const stadt = data.archetypes.stadt;
    expect(stadt.hasEngpass).toBe(true);
    expect(stadt.peakN1Pct).toBeGreaterThanOrEqual(0);
    expect(stadt.xMw).not.toBeNull();
    expect(stadt.yMw).not.toBeNull();
    if (stadt.xMw != null && stadt.yMw != null) {
      expect(stadt.yMw).toBeGreaterThanOrEqual(stadt.xMw);
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

  it("revenue ordering", () => {
    const d = loadOrtArchetypes();
    expect(d.archetypes.land.revenuePct12m.vertrag).toBeLessThanOrEqual(100);
    expect(d.archetypes.land.revenuePct12m.netz).toBeLessThanOrEqual(100);
  });
});
