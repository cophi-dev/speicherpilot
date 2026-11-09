import "server-only";

import { unstable_cache } from "next/cache";

import { loadGermanyView } from "@/lib/germanyView";
import { pickDefaultMonatMonthKey } from "@/lib/monatCalendar";

export type NavShortcuts = {
  tagHref: string;
  monatHref: string;
  lastCompleteDayKey: string;
};

async function buildNavShortcuts(): Promise<NavShortcuts> {
  const now = new Date();
  const view = await loadGermanyView(now, "/", {});
  const records = view.auffaelligkeitRecords ?? [];
  const lastCompleteDayKey = view.lastCompleteDayKey;
  const monthKey = pickDefaultMonatMonthKey(records, lastCompleteDayKey);
  return {
    tagHref: `/tag/${lastCompleteDayKey}`,
    monatHref: `/monat/${monthKey}`,
    lastCompleteDayKey,
  };
}

/** Gecachte Nav-Ziele (ISR 30 min) — kein teurer Live-Blocker auf `/tag` oder `/monat`. */
export const resolveNavShortcuts = unstable_cache(buildNavShortcuts, ["site-nav-shortcuts-v2"], {
  revalidate: 1800,
});
