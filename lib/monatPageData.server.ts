import "server-only";

import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import { pickLastCompleteDayKey } from "@/lib/completeBerlinDay";
import { loadGermanyView } from "@/lib/germanyView";
import { loadTagRollSnapshot } from "@/lib/tagRollSnapshot.server";
import { tagRollSnapshotDataStandLabel, tagRollSnapshotMonthEligible } from "@/lib/tagRollSnapshotPolicy";
import { monthHasAnyRecord } from "@/lib/monatCalendar";
import { nationalFleetMonthAvailable } from "@/lib/nationalMonthFleetModel";
import {
  fleetMonthPreferredObservation,
  loadMonatObservationFallback,
  type MonatObservationFallback,
} from "@/lib/monatObservationFallback.server";

export type MonatPageData = {
  todayKey: string;
  lastCompleteDayKey: string;
  records: TagesKennzahlRecord[];
  dataStand: string;
  /** Live Energy-Charts erfolgreich für Beobachtungsgraph */
  observationLive: boolean;
  observationFallback: MonatObservationFallback | null;
};

function inferLastCompleteFromRecords(records: TagesKennzahlRecord[], todayKey: string): string {
  const keys = records.map((r) => r.dateKey).filter((k) => k <= todayKey);
  return keys.length ? keys[keys.length - 1]! : todayKey;
}

export async function loadMonatPageData(monthKey: string, now = new Date()): Promise<MonatPageData> {
  const todayKeyDirect = formatBerlinDateKeyFromUtcDate(now);
  const monthStart = `${monthKey}-01`;
  try {
    const snap = loadTagRollSnapshot();
    if (tagRollSnapshotMonthEligible(monthKey, todayKeyDirect, snap)) {
      const records = snap.records;
      const lastCompleteDayKey = pickLastCompleteDayKey(snap.days, todayKeyDirect);
      let observationFallback: MonatObservationFallback | null = null;
      if (nationalFleetMonthAvailable(monthKey) && fleetMonthPreferredObservation(monthKey)) {
        observationFallback = loadMonatObservationFallback(monthKey);
      }
      return {
        todayKey: todayKeyDirect,
        lastCompleteDayKey,
        records,
        dataStand: tagRollSnapshotDataStandLabel(snap),
        observationLive: monthHasAnyRecord(monthKey, records),
        observationFallback,
      };
    }
  } catch {
    /* snapshot missing — live path */
  }

  let view: Awaited<ReturnType<typeof loadGermanyView>> | null = null;
  try {
    view = await loadGermanyView(now, "/monat", {});
  } catch {
    view = null;
  }

  const todayKey = view?.todayKey ?? monthKey + "-31";
  let records = view?.auffaelligkeitRecords ?? [];
  let dataStand = view?.stand ?? "—";
  let observationLive = records.length > 0 && monthHasAnyRecord(monthKey, records);
  let observationFallback: MonatObservationFallback | null = null;

  if (!observationLive && (nationalFleetMonthAvailable(monthKey) || fleetMonthPreferredObservation(monthKey))) {
    observationFallback = loadMonatObservationFallback(monthKey);
    if (observationFallback) {
      records = observationFallback.records;
      dataStand = observationFallback.dataStandLabel;
      observationLive = false;
    }
  }

  const lastCompleteDayKey = view?.lastCompleteDayKey ?? inferLastCompleteFromRecords(records, todayKey);

  if (!monthHasAnyRecord(monthKey, records) && !nationalFleetMonthAvailable(monthKey)) {
    return {
      todayKey,
      lastCompleteDayKey,
      records,
      dataStand,
      observationLive,
      observationFallback,
    };
  }

  return {
    todayKey,
    lastCompleteDayKey,
    records,
    dataStand,
    observationLive,
    observationFallback,
  };
}
