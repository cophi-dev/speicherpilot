import { permanentRedirect } from "next/navigation";

import { berlinMonthKeyFromDateKey } from "@/lib/monatCalendar";
import { loadGermanyView } from "@/lib/germanyView";

export default async function MonatIndexPage() {
  const view = await loadGermanyView(new Date(), "/monat", {});
  const monthKey = berlinMonthKeyFromDateKey(view.lastCompleteDayKey);
  permanentRedirect(`/monat/${monthKey}`);
}
