import { archetypeByKey } from "@/lib/ortArchetypes";
import { auditOrtStorageDispatch } from "@/lib/ortStorageDispatchAudit";

describe("ortStorageDispatchAudit", () => {
  it("validates all typtag modes in ort-archetypes.json", () => {
    for (const archKey of ["land", "stadt"] as const) {
      const data = archetypeByKey(archKey);
      for (const mode of ["markt", "vertrag", "netz"] as const) {
        const s = data.series.modes[mode];
        const report = auditOrtStorageDispatch({
          chargeMw: s.c,
          dischargeMw: s.d,
          socStartMwh: s.soc,
          energyMwh: data.storage.eMwh,
          powerMw: data.storage.pMw,
        });
        expect(report.simultaneousIntervals).toBe(0);
        expect(report.ok).toBe(true);
        expect(report.socEndMwh).toBeGreaterThanOrEqual(0.1 * data.storage.eMwh - 1e-3);
        expect(report.socEndMwh).toBeLessThanOrEqual(0.9 * data.storage.eMwh + 1e-3);
      }
    }
  });
});
