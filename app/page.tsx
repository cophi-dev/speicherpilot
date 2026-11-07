import { StartPageV4 } from "@/components/home/StartPageV4";
import { loadGermanyView } from "@/lib/germanyView";

/** Must stay a literal and match DAILY_SERIES_REVALIDATE_SECONDS (30 minutes). */
export const revalidate = 1800;

export default async function Home() {
  const view = await loadGermanyView(new Date(), "/", {});

  if (!view.overviews || !view.kopfDayKey || !view.auffaelligkeitRecords) {
    return null;
  }

  return (
    <StartPageV4
      overviews={view.overviews}
      dispatch={view.dispatch}
      todayKey={view.todayKey}
      kopfDayKey={view.homeTagesDayKey ?? view.kopfDayKey}
      auffaelligkeitRecords={view.auffaelligkeitRecords}
      dataStand={view.stand}
      homeDayPanel={view.homeDayPanel}
      kopfDay={view.kopfDay}
    />
  );
}
