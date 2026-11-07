import { permanentRedirect } from "next/navigation";

import { pickDefaultMonatMonthKey } from "@/lib/monatCalendar";
import { loadGermanyView } from "@/lib/germanyView";

export default async function MonatIndexPage() {
  const view = await loadGermanyView(new Date(), "/monat", {});
  const records = view.auffaelligkeitRecords ?? [];
  const monthKey = pickDefaultMonatMonthKey(records, view.lastCompleteDayKey);
  permanentRedirect(`/monat/${monthKey}`);
}
