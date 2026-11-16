import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";

/** Erste 30 Tage im Fenster sind Vorlauf (gleiche Regel wie /tag/[datum]). */
export const INDEXABLE_TAG_VORLAUF_EXCLUSIVE = 30;

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