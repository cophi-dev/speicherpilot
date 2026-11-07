import { auditBadgeV2 } from "@/lib/badgeV2Audit";
import { badgeForArchetype, archetypeByKey } from "@/lib/ortArchetypes";

describe("badgeV2Audit", () => {
  it("matches assessBadgeV2 id and supplies evidence for land/markt", () => {
    const data = archetypeByKey("land");
    const series = data.series.modes.markt;
    const audit = auditBadgeV2({ L0n1: data.series.L0n1, L1n1: series.L1n1 });
    const stored = badgeForArchetype(data, "markt");
    expect(audit.id).toBe(stored.id);
    expect(audit.worseningEvidence.length).toBeGreaterThan(0);
    expect(audit.hint).toMatch(/Verschärfung|qh/);
  });
});
