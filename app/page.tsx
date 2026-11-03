import { MarketingHome } from "@/components/home/MarketingHome";
import { loadGermanyView } from "@/lib/germanyView";

/** Must stay a literal and match DAILY_SERIES_REVALIDATE_SECONDS (30 minutes). */
export const revalidate = 1800;

export default async function Home() {
  const view = await loadGermanyView(new Date(), "/", {});

  return (
    <MarketingHome
      overviews={view.overviews}
      until={view.until}
      dispatch={view.dispatch}
      exampleDispatch={view.exampleDispatch}
      todayKey={view.todayKey}
    />
  );
}
