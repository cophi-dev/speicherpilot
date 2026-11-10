import { ResearchHomePage } from "@/components/research/ResearchHomePage";
import { loadTagRollSnapshot } from "@/lib/tagRollSnapshot.server";
import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import { buildResearchHome } from "@/lib/research/loadResearchHome.server";

/** Must stay a literal and match DAILY_SERIES_REVALIDATE_SECONDS (30 minutes). */
export const revalidate = 1800;

export default async function Home() {
  const todayKey = formatBerlinDateKeyFromUtcDate(new Date());
  const snap = loadTagRollSnapshot();
  const model = buildResearchHome(snap.days, todayKey);
  if (!model) {
    return null;
  }
  return <ResearchHomePage model={model} />;
}
