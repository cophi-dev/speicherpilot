import { ResearchHomePage } from "@/components/research/ResearchHomePage";
import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import { buildResearchHome } from "@/lib/research/loadResearchHome.server";
import { loadResearchDays } from "@/lib/research/loadResearchDays.server";
import { loadEps70Teaser } from "@/lib/simulatorTeaser.server";

/** Must stay a literal and match DAILY_SERIES_REVALIDATE_SECONDS (30 minutes). */
export const revalidate = 1800;
/** Gestern: Snapshot plus Live-Tail — nicht beim Build einfrieren. */
export const dynamic = "force-dynamic";

export default async function Home() {
  const now = new Date();
  const todayKey = formatBerlinDateKeyFromUtcDate(now);
  const days = await loadResearchDays(now);
  const model = buildResearchHome(days, todayKey);
  if (!model) {
    return null;
  }
  const teaser = loadEps70Teaser();
  return <ResearchHomePage model={model} simulatorCostPct={teaser.costPctText} />;
}
