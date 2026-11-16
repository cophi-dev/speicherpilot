import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import { formatBerlinMonthLabel, isBerlinMonthKey } from "@/lib/monatCalendar";

export const HOME_DOCUMENT_TITLE =
  "Großspeicher und Restlast-Spitze in Deutschland, Szenarien täglich gerechnet | SpeicherPilot";

export const TAG_TODAY_DOCUMENT_TITLE =
  "Restlast, Day-Ahead-Preis und Batteriespeicher heute | SpeicherPilot";

export const FLEET_MONAT_DOCUMENT_TITLE =
  "Batteriespeicher-Flotte im Monat: Restlastspitze je Fahrweise | SpeicherPilot";

export function tagDocumentTitle(datum: string, isToday: boolean): string {
  if (isToday) {
    return TAG_TODAY_DOCUMENT_TITLE;
  }
  return `Restlast, Day-Ahead-Preis und Batteriespeicher · ${formatBerlinDayLabel(datum)} | SpeicherPilot`;
}

export function tagPageDescription(datum: string, isToday: boolean): string {
  return isToday
    ? "Laufender Tag in Deutschland: vorläufige Restlast, Day-Ahead und Markt-Fahrplan."
    : "Ein Tag in Deutschland: Lücke, Residuallast und Kennzahlen mit Rang.";
}

export function monatDocumentTitle(monat: string, fleetMonth: boolean): string {
  if (fleetMonth) {
    return FLEET_MONAT_DOCUMENT_TITLE;
  }
  const label = isBerlinMonthKey(monat) ? formatBerlinMonthLabel(monat) : monat;
  return `Monat · ${label} | SpeicherPilot`;
}

export function monatPageDescription(fleetMonth: boolean): string {
  return fleetMonth
    ? "Höchste Restlast je Flottenstufe und Fahrweise, Stunden und Überschuss-Pool — national, Modellrechnung."
    : "Monatsverlauf in der geladenen Tagesreihe: Überschuss-Graph und Sprung zu einzelnen Tagen.";
}