import { knotenNearestDay, knotenDayInWindow } from "@/lib/knoten/knotenSaison";
import type { KnotenManifest } from "@/lib/knoten/knotenTypes";

/** Deep link from /tag to /knoten for the same calendar day when possible. */
export function knotenHrefFromTagDay(dayKey: string, manifest: KnotenManifest): string {
  if (knotenDayInWindow(dayKey)) {
    return `/knoten?tag=${dayKey}`;
  }
  const min = manifest.dateRanges.sommer[0];
  const max = manifest.dateRanges.herbst[1];
  if (dayKey < min || dayKey > max) {
    return "/knoten";
  }
  return `/knoten?tag=${knotenNearestDay(dayKey, manifest)}`;
}