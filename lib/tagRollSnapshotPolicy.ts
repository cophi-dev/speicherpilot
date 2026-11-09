import { addBerlinCalendarDays } from "@/lib/berlinCalendar";
import { auditBerlinPowerDay, type BerlinDayCompleteness } from "@/lib/berlinDayCompleteness";
import { dayIsUsable } from "@/lib/liveFleetDispatch";
import type { PowerSlot } from "@/lib/powerMix";
import type { ResidualDay } from "@/lib/windSolarResidual";

/** Heute, gestern und vorgestern bleiben live — Snapshot erst ab dem Tag davor. */
export const TAG_SNAPSHOT_LIVE_TAIL_DAYS = 3;

export type TagRollSnapshotSlice = {
  coverageStart: string;
  coverageEnd: string;
  builtAt?: string;
  dataStand: string;
  offshorePresent: boolean;
  powerSlots: PowerSlot[];
  days: ResidualDay[];
};

/** Letzter Kalendertag, der noch aus dem eingefrorenen Snapshot kommen darf (relativ zu todayKey). */
export function tagRollSnapshotNewestFrozenDay(todayKey: string): string {
  return addBerlinCalendarDays(todayKey, -TAG_SNAPSHOT_LIVE_TAIL_DAYS);
}

export function tagRollSnapshotDayComplete(
  snap: TagRollSnapshotSlice,
  dayKey: string,
): BerlinDayCompleteness {
  const day = snap.days.find((d) => d.dateBerlin === dayKey);
  if (!day) {
    return {
      ok: false,
      expectedQuarters: 0,
      actualQuarters: 0,
      reason: "count",
      residualComplete: false,
      generationComplete: false,
    };
  }
  const residualQuarters = day.slots.length;
  if (!dayIsUsable(day)) {
    return {
      ok: false,
      expectedQuarters: 0,
      actualQuarters: residualQuarters,
      reason: "count",
      residualComplete: false,
      generationComplete: false,
    };
  }
  const daySlots = snap.powerSlots.filter((s) => s.dateBerlin === dayKey);
  return auditBerlinPowerDay(daySlots, dayKey, snap.offshorePresent);
}

/**
 * Snapshot nur für abgeschlossene Berlin-Tage (92/96/100 QH) innerhalb Coverage,
 * die älter sind als heute/gestern/vorgestern.
 */
export function tagRollSnapshotEligible(
  dayKey: string,
  todayKey: string,
  snap: TagRollSnapshotSlice,
): boolean {
  if (dayKey < snap.coverageStart || dayKey > snap.coverageEnd) {
    return false;
  }
  const frozenThrough = tagRollSnapshotNewestFrozenDay(todayKey);
  if (dayKey > frozenThrough) {
    return false;
  }
  return tagRollSnapshotDayComplete(snap, dayKey).ok;
}

/** Monat nur aus Snapshot, wenn der gesamte Kalendermonat eingefroren sein darf. */
export function tagRollSnapshotMonthEligible(monthKey: string, todayKey: string, snap: TagRollSnapshotSlice): boolean {
  const monthStart = `${monthKey}-01`;
  const monthEnd = monthEndKey(monthKey);
  if (monthStart < snap.coverageStart || monthEnd > snap.coverageEnd) {
    return false;
  }
  return monthEnd <= tagRollSnapshotNewestFrozenDay(todayKey);
}

function monthEndKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const last = new Date(Date.UTC(y!, m!, 0));
  const mm = String(m).padStart(2, "0");
  const dd = String(last.getUTCDate()).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

export function tagRollSnapshotDataStandLabel(snap: Pick<TagRollSnapshotSlice, "builtAt" | "dataStand">): string {
  const built = snap.builtAt?.slice(0, 10) ?? "—";
  return `${snap.dataStand} · eingefroren ${built}`;
}
