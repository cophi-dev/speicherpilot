import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";

export type DisplayLanguage = "de" | "en";

export function dateFnsLocale(language: DisplayLanguage) {
  return language === "de" ? de : enUS;
}

/**
 * Calendar-button labels. date-fns defaults to English month and weekday names,
 * which produced mixed strings such as "Tuesday, 20. October" on the German view.
 */
export function formatBerlinDayButtonLabel(
  date: Date,
  language: DisplayLanguage,
  prominent: boolean
): string {
  const locale = dateFnsLocale(language);
  if (prominent) {
    return format(date, language === "de" ? "EEEE, d. MMMM yyyy" : "EEEE, MMMM d, yyyy", {
      locale,
    });
  }
  return format(date, language === "de" ? "dd.MM.yyyy" : "MMM d, yyyy", { locale });
}
