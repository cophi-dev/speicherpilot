"use client";

import { useMemo } from "react";

import { ConnectionStory } from "@/components/home/ConnectionStory";
import { HomeRing } from "@/components/home/HomeRing";
import { useLanguage } from "@/components/language-context";
import { Uebersicht } from "@/components/uebersicht/Uebersicht";
import type { OverviewsBundle } from "@/lib/germanyView";
import type { LiveDispatchInput } from "@/lib/liveFleetDispatch";
import { einschaetzung } from "@/lib/overviewSentence";

export function MarketingHome({
  overviews,
  until,
  dispatch,
  exampleDispatch,
  todayKey,
}: {
  overviews: OverviewsBundle | null;
  until: string | null;
  dispatch: LiveDispatchInput;
  exampleDispatch: LiveDispatchInput;
  todayKey: string;
}) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);

  const pageTitle = tx(
    "Wie viel Strom aus Wind und Sonne war übrig — und hätte mehr Speicher ihn aufgenommen?",
    "How much wind and solar power was left over — and would more storage have absorbed it?"
  );

  const leadSentence = useMemo(() => {
    if (!overviews) {
      return null;
    }
    return einschaetzung(overviews.byBlick.heute, 1, language, {
      dataStand: overviews.dataStand,
      until,
    });
  }, [language, overviews, until]);

  if (!overviews) {
    return null;
  }

  return (
    <div className="start-page">
      <header className="start-story-lead">
        <div className="mx-auto max-w-[1200px] px-5 md:px-8">
          <p className="day-kicker">{tx("Deutschland · SpeicherPilot", "Germany · SpeicherPilot")}</p>
          <h1 id="start-page-title" className="start-page-h1">
            {pageTitle}
          </h1>
          <p className="start-story-lead-text">{leadSentence}</p>
        </div>
      </header>

      <HomeRing
        dispatch={dispatch}
        exampleDispatch={exampleDispatch}
        todayKey={todayKey}
        until={until}
        showHero={false}
        showMore={false}
      />

      <ConnectionStory />

      <Uebersicht bundle={overviews} until={until} hideLeadAssessment overviewTitle={pageTitle} />
    </div>
  );
}
