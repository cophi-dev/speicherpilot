import { addBerlinCalendarDays } from "@/lib/berlinCalendar";
import { auditBerlinPowerDay } from "@/lib/berlinDayCompleteness";
import type { GermanyView } from "@/lib/germanyView";
import { dayIsUsable } from "@/lib/liveFleetDispatch";
import { slotsInRange, type PowerParse } from "@/lib/powerMix";
import type { ResidualDay } from "@/lib/windSolarResidual";

export const GERMANY_VIEW_NOT_CACHEABLE = "germany-view-not-cacheable";

export class GermanyViewNotCacheableError extends Error {
  constructor() {
    super(GERMANY_VIEW_NOT_CACHEABLE);
    this.name = "GermanyViewNotCacheableError";
  }
}

export function isGermanyViewNotCacheableError(error: unknown): boolean {
  return error instanceof GermanyViewNotCacheableError;
}

export function tagSelectWindowStart(todayKey: string): string {
  return addBerlinCalendarDays(todayKey, -30);
}

export function isTagDateInSelectWindow(datum: string, todayKey: string): boolean {
  const start = tagSelectWindowStart(todayKey);
  return datum >= start && datum <= todayKey;
}

/** View ohne verwertbare Tages-Kennzahlen (typisch: Power-Fetch leer/fehlgeschlagen). */
export function germanyViewFailedPowerLoad(view: Pick<GermanyView, "auffaelligkeitRecords">): boolean {
  return !view.auffaelligkeitRecords?.length;
}

/**
 * Tag-Tag gilt erst als anzeigbar, wenn die Berliner QH-Serie und Träger vollständig sind
 * (wie im Roll-Snapshot eingefroren wird).
 */
export function isTagBerlinDayStrictComplete(
  parsed: PowerParse,
  day: ResidualDay,
): boolean {
  if (!dayIsUsable(day)) {
    return false;
  }
  const daySlots = slotsInRange(parsed.slots, day.dateBerlin, day.dateBerlin);
  return auditBerlinPowerDay(daySlots, day.dateBerlin, parsed.offshorePresent).ok;
}

/**
 * ISR für Tag-Views und Nav-Shortcuts darf keine Fehl-Ladung oder
 * „ausserhalb“-Fehlklassifikation innerhalb des 30-Tage-Fensters einfrieren.
 */
export function assertGermanyViewTagIsrCacheable(view: GermanyView, datum: string): void {
  if (germanyViewFailedPowerLoad(view)) {
    throw new GermanyViewNotCacheableError();
  }
  if (!isTagDateInSelectWindow(datum, view.todayKey)) {
    return;
  }
  if (view.requestedTag === datum && view.requestedTagStatus === "ausserhalb") {
    throw new GermanyViewNotCacheableError();
  }
  if (
    view.requestedTag === datum &&
    view.requestedTagStatus === "unvollstaendig" &&
    view.dispatch.day?.dateBerlin !== datum
  ) {
    throw new GermanyViewNotCacheableError();
  }
}

export function assertNavShortcutsIsrCacheable(view: GermanyView): void {
  if (germanyViewFailedPowerLoad(view)) {
    throw new GermanyViewNotCacheableError();
  }
  const last = view.lastCompleteDayKey;
  if (!view.auffaelligkeitRecords?.some((r) => r.dateKey === last)) {
    throw new GermanyViewNotCacheableError();
  }
}
