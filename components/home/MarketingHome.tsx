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
      <section className="start-story-lead" aria-labelledby="start-story-lead">
        <div className="mx-auto max-w-[1200px] px-5 md:px-8">
          <p id="start-story-lead" className="sr-only">
            {tx("Kurzüberblick für heute", "Brief overview for today")}
          </p>
          <p className="start-story-lead-text">{leadSentence}</p>
          <p className="start-story-lead-link">
            <a href="/methodik#was" className="underline underline-offset-[3px]">
              {tx("Ring lesen", "How to read the ring")}
            </a>
          </p>
        </div>
      </section>

      <HomeRing
        dispatch={dispatch}
        exampleDispatch={exampleDispatch}
        todayKey={todayKey}
        until={until}
        showHero={false}
        showMore={false}
      />

      <ConnectionStory />

      <Uebersicht bundle={overviews} until={until} hideLeadAssessment />
    </div>
  );
}
