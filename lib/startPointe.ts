import { auffaelligkeitForDay, weekdayLabelDe, type TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import { formatQuantity } from "@/lib/formatQuantity";

export type StartPointe = {
  h1: string;
  subline: string;
  heroValue: string;
  heroUnit: string;
  heroKern: string;
  /** Tag-page H1 for the same kopf day — must differ from `h1`. */
  tagH1ForCompare: string;
};

function windowEndingAt(records: TagesKennzahlRecord[], endKey: string): TagesKennzahlRecord[] {
  const idx = records.findIndex((r) => r.dateKey === endKey);
  if (idx < 0) {
    return [];
  }
  return records.slice(Math.max(0, idx - 29), idx + 1);
}

/** 30-day headline for `/` — not the same wording as `/tag/{gestern}`. */
export function startPointe(
  records: TagesKennzahlRecord[],
  kopfDayKey: string
): StartPointe {
  const win = windowEndingAt(records, kopfDayKey);
  const end = win[win.length - 1];
  const tagAuff = auffaelligkeitForDay(records, kopfDayKey);
  const tagH1ForCompare =
    end && end.dryStreak >= 3
      ? `${end.dryStreak}. Tag in Folge ohne Überschuss`
      : tagAuff.kopfH1;

  const gesternLabel = formatBerlinDayLabel(kopfDayKey);
  const noSurplus = win.filter((r) => r.surplusGwh < 0.05).length;
  const surplusDays = win.filter((r) => r.surplusGwh >= 0.05);
  const strongest = surplusDays.reduce<TagesKennzahlRecord | null>(
    (best, r) => (!best || r.surplusGwh > best.surplusGwh ? r : best),
    null
  );
  const totalSurplus = surplusDays.reduce((s, r) => s + r.surplusGwh, 0);

  if (end && end.dryStreak >= 3) {
    const h1 = `30 Tage: ${noSurplus} ohne Überschuss — gestern der ${end.dryStreak}. in Folge`;
    const subline = strongest
      ? `Stärkster Überschuss im Fenster: ${formatQuantity(strongest.surplusGwh, "de", 1)} GWh am ${weekdayLabelDe(strongest.dateKey)}. Gestern (${gesternLabel}) blieb wieder nichts zum Laden.`
      : `Gestern (${gesternLabel}): ${end.dryStreak}. Tag in Folge ohne Überschuss im Modell.`;
    return {
      h1,
      subline,
      heroValue: String(noSurplus),
      heroUnit: "Tage",
      heroKern: "ohne Überschuss (30 Tage)",
      tagH1ForCompare,
    };
  }

  const h1 = `30 Tage im Blick: ${surplusDays.length} mit Überschuss, ${noSurplus} ohne`;
  const peakLine =
    end?.eveningPeakGw != null
      ? ` Abendspitze gestern (${gesternLabel}): ${formatQuantity(end.eveningPeakGw, "de", 1)} GW.`
      : "";
  const subline = strongest
    ? `Stärkster Tag: ${weekdayLabelDe(strongest.dateKey)} mit ${formatQuantity(strongest.surplusGwh, "de", 1)} GWh.${peakLine} Summe Überschuss im Fenster: ${formatQuantity(totalSurplus, "de", 1)} GWh.`
    : `Gestern (${gesternLabel}) im Kontext der letzten 30 Tage.${peakLine}`;

  return {
    h1,
    subline,
    heroValue: String(surplusDays.length),
    heroUnit: "Tage",
    heroKern: "mit Überschuss",
    tagH1ForCompare,
  };
}
