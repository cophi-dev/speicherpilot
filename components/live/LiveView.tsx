"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { dayPageHeading, DayPicker } from "@/components/live/DayPicker";
import { LiveRing } from "@/components/live/LiveRing";
import { PowerBoard } from "@/components/mix/PowerBoard";
import { useLanguage } from "@/components/language-context";
import type { OverviewsBundle, RequestedTagStatus } from "@/lib/germanyView";
import type { OverviewEvaluation } from "@/lib/overviewChain";
import type { LiveDispatchInput } from "@/lib/liveFleetDispatch";
import { parseLiveFactor, type LiveDispatchFactor } from "@/lib/liveFleetDispatch";
import type { StripReading } from "@/lib/liveStrip";
import type { PowerBoardModel } from "@/lib/powerBoard";
import { einschaetzung } from "@/lib/overviewSentence";

export function LiveView({
  dispatch,
  until,
  stand,
  readings,
  board,
  overviews,
  dayOverview,
  todayKey,
  requestedTag,
  requestedTagStatus,
}: {
  dispatch: LiveDispatchInput;
  until: string | null;
  stand: string;
  readings: StripReading[];
  board: PowerBoardModel;
  overviews: OverviewsBundle | null;
  dayOverview: OverviewEvaluation | null;
  todayKey: string;
  requestedTag: string | null;
  requestedTagStatus: RequestedTagStatus;
}) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const router = useRouter();
  const searchParams = useSearchParams();
  const factor = parseLiveFactor(searchParams.get("x"));
  const activeTag = requestedTag ?? dispatch.day?.dateBerlin ?? todayKey;
  const isToday = activeTag === todayKey;

  const daySentence =
    dayOverview !== null
      ? einschaetzung(dayOverview, factor, language, { until: isToday ? until : null })
      : null;

  function onFactor(next: LiveDispatchFactor) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("x", String(next));
    const query = params.toString();
    router.replace(query ? `/live?${query}` : "/live", { scroll: false });
  }

  const heading = dayPageHeading(activeTag, todayKey, language, isToday ? until : null);

  return (
    <>
      <DayPicker todayKey={todayKey} selectedTag={requestedTag} overviews={overviews} />
      {requestedTagStatus === "ausserhalb" ? (
        <p className="live-tag-notice mx-auto max-w-[1200px] px-4" role="status">
          {tx(
            `Für den ${requestedTag ?? ""} haben wir keine Daten. Wir zeigen die letzten 30 Tage.`,
            `We have no data for ${requestedTag ?? ""}. We show the last 30 days.`
          )}
        </p>
      ) : null}
      {requestedTagStatus === "unvollstaendig" ? (
        <p className="live-tag-notice mx-auto max-w-[1200px] px-4" role="status">
          {tx("Für diesen Tag sind die Rohdaten noch unvollständig.", "Raw data for this day is still incomplete.")}
        </p>
      ) : null}
      <LiveRing
        dispatch={dispatch}
        until={until}
        heading={heading}
        subheading={daySentence}
        isToday={isToday}
        stand={stand}
        readings={readings}
        onFactor={onFactor}
        factor={factor}
      />
      <PowerBoard model={board} missingFactor={5} hideSocLine={false} />
      <p className="live-overview-link mx-auto max-w-[1200px] px-4 pb-8">
        <Link href="/#uebersicht" prefetch={false}>
          {tx("Zur Zeitraum-Übersicht auf der Startseite", "To the period overview on the homepage")}
        </Link>
      </p>
    </>
  );
}
