import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import { prevBerlinDateKey } from "@/lib/berlinCalendar";

/** Erste 30 Tage im Fenster sind Vorlauf (gleiche Regel wie /tag/[datum]). */
export const INDEXABLE_TAG_VORLAUF_EXCLUSIVE = 30;

/**
 * Oberste indexierbare Kalendergrenze: /tag/heute ist bewusst noindex;
 * auch ein als „vollständig“ markierter heutiger Tag gehört nicht in die Sitemap.
 */
export function indexableTagDayCap(lastCompleteDayKey: string, todayKey: string): string {
  const beforeToday = prevBerlinDateKey(todayKey);
  return lastCompleteDayKey < beforeToday ? lastCompleteDayKey : beforeToday;
}

export function indexableTagPathsFromRecords(
  records: TagesKennzahlRecord[],
  lastCompleteDayKey: string,
  todayKey: string,
): string[] {
  const paths: string[] = [];
  for (let index = INDEXABLE_TAG_VORLAUF_EXCLUSIVE; index < records.length; index += 1) {
    const dayKey = records[index]!.dateKey;
    if (dayKey > lastCompleteDayKey || dayKey >= todayKey) {
      continue;
    }
    paths.push(`/tag/${dayKey}`);
  }
  return paths;
}