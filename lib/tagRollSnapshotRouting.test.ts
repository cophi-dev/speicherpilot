/**
 * @jest-environment node
 */
import { tagRollSnapshotEligibleForView } from "@/lib/tagRollSnapshot.server";

describe("tagRollSnapshot routing", () => {
  const today = new Date("2026-11-09T14:00:00Z");
  const todayKey = "2026-11-09";

  it("routet 29.10. auf Snapshot, gestern auf Live", () => {
    expect(tagRollSnapshotEligibleForView("2026-10-29", todayKey)).toBe(true);
    expect(tagRollSnapshotEligibleForView("2026-11-08", todayKey)).toBe(false);
    expect(tagRollSnapshotEligibleForView("2026-11-07", todayKey)).toBe(false);
  });

  it("today param matches calendar", () => {
    expect(today.toISOString().startsWith("2026-11-09")).toBe(true);
  });
});
