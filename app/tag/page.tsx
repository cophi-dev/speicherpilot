import { redirect } from "next/navigation";

import { formatBerlinDateKeyFromUtcDate, prevBerlinDateKey } from "@/lib/berlinCalendar";

export default function TagIndexPage() {
  const today = formatBerlinDateKeyFromUtcDate(new Date());
  redirect(`/tag/${prevBerlinDateKey(today)}`);
}
