import "server-only";

import { unstable_cache } from "next/cache";

import {
  assertNavShortcutsIsrCacheable,
  isGermanyViewNotCacheableError,
} from "@/lib/germanyViewCachePolicy";
import { loadGermanyView, type GermanyView } from "@/lib/germanyView";
import { pickDefaultMonatMonthKey } from "@/lib/monatCalendar";

export type NavShortcuts = {
  tagHref: string;
  monatHref: string;
  lastCompleteDayKey: string;
};

function navShortcutsFromView(view: GermanyView): NavShortcuts {
  const records = view.auffaelligkeitRecords ?? [];
  const lastCompleteDayKey = view.lastCompleteDayKey;
  const monthKey = pickDefaultMonatMonthKey(records, lastCompleteDayKey);
  return {
    tagHref: `/tag/${lastCompleteDayKey}`,
    monatHref: `/monat/${monthKey}`,
    lastCompleteDayKey,
  };
}

async function buildNavShortcutsUncached(): Promise<NavShortcuts> {
  const now = new Date();
  const view = await loadGermanyView(now, "/", {});
  return navShortcutsFromView(view);
}

async function buildNavShortcutsForCache(): Promise<NavShortcuts> {
  const now = new Date();
  const view = await loadGermanyView(now, "/", {});
  assertNavShortcutsIsrCacheable(view);
  return navShortcutsFromView(view);
}

const cachedNavShortcuts = unstable_cache(buildNavShortcutsForCache, ["site-nav-shortcuts-v3"], {
  revalidate: 1800,
});

/** Gecachte Nav-Ziele (ISR 30 min) — kein teurer Live-Blocker auf `/tag` oder `/monat`. */
export async function resolveNavShortcuts(): Promise<NavShortcuts> {
  try {
    return await cachedNavShortcuts();
  } catch (error) {
    if (isGermanyViewNotCacheableError(error)) {
      return buildNavShortcutsUncached();
    }
    throw error;
  }
}
