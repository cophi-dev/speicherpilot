import { addBerlinCalendarDays } from "@/lib/berlinCalendar";
import {
  tagRollSnapshotEligible,
  tagRollSnapshotMonthEligible,
  tagRollSnapshotNewestFrozenDay,
  TAG_SNAPSHOT_LIVE_TAIL_DAYS,
} from "@/lib/tagRollSnapshotPolicy";
import { loadTagRollSnapshot } from "@/lib/tagRollSnapshot.server";

describe("tagRollSnapshotPolicy", () => {
  const todayKey = "2026-11-09";
  const snap = loadTagRollSnapshot();

  it("lässt heute, gestern und vorgestern nicht aus dem Snapshot kommen", () => {
    expect(tagRollSnapshotNewestFrozenDay(todayKey)).toBe(
      addBerlinCalendarDays(todayKey, -TAG_SNAPSHOT_LIVE_TAIL_DAYS),
    );
    expect(tagRollSnapshotEligible("2026-11-09", todayKey, snap)).toBe(false);
    expect(tagRollSnapshotEligible("2026-11-08", todayKey, snap)).toBe(false);
    expect(tagRollSnapshotEligible("2026-11-07", todayKey, snap)).toBe(false);
  });

  it("nutzt Snapshot für ältere vollständige Tage (29.10.)", () => {
    expect(tagRollSnapshotEligible("2026-10-29", todayKey, snap)).toBe(true);
    expect(tagRollSnapshotEligible("2026-11-06", todayKey, snap)).toBe(true);
  });

  it("Monat Oktober eingefroren, laufender November live", () => {
    expect(tagRollSnapshotMonthEligible("2026-10", todayKey, snap)).toBe(true);
    expect(tagRollSnapshotMonthEligible("2026-11", todayKey, snap)).toBe(false);
  });
});
