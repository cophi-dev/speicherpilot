import { assessBadgeV2, loadOrtArchetypes } from "@/lib/ortArchetypes";

describe("ortArchetypes", () => {
  it("validates file schema", () => {
    const data = loadOrtArchetypes();
    expect(data.archetypes.land.xMw).toBeLessThanOrEqual(data.archetypes.land.yMw);
    expect(data.archetypes.stadt.xMw).toBeLessThanOrEqual(data.archetypes.stadt.yMw);
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
