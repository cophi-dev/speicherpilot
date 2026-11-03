"use client";

import { useMemo } from "react";

import { AuffaelligkeitKopf } from "@/components/home/AuffaelligkeitKopf";
import { ConnectionStory } from "@/components/home/ConnectionStory";
import { HomeRing } from "@/components/home/HomeRing";
import { PerspectiveChoice } from "@/components/PerspectiveChoice";
import { Uebersicht } from "@/components/uebersicht/Uebersicht";
import { auffaelligkeitForDay } from "@/lib/auffaelligkeit";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import type { OverviewsBundle } from "@/lib/germanyView";
import type { LiveDispatchInput } from "@/lib/liveFleetDispatch";
import { formatQuantity } from "@/lib/formatQuantity";

export function StartPageV4({
  overviews,
  until,
  dispatch,
  exampleDispatch,
  todayKey,
  kopfDayKey,
  auffaelligkeitRecords,
  dataStand,
}: {
  overviews: OverviewsBundle | null;
  until: string | null;
  dispatch: LiveDispatchInput;
  exampleDispatch: LiveDispatchInput;
  todayKey: string;
  kopfDayKey: string;
  auffaelligkeitRecords: TagesKennzahlRecord[];
  dataStand: string;
}) {
  const auff = useMemo(
    () => auffaelligkeitForDay(auffaelligkeitRecords, kopfDayKey),
    [auffaelligkeitRecords, kopfDayKey]
  );

  const tagRecord = auffaelligkeitRecords.find((r) => r.dateKey === kopfDayKey);
  const systemModel = overviews?.byBlick["30tage"];
  const absorbedShare = systemModel?.factors[1]?.absorbedShare;
  const fleet = dispatch.fleet;

  if (!overviews || !fleet) {
    return null;
  }

  const surplusLine =
    tagRecord && tagRecord.surplusGwh >= 0.05
      ? `${formatQuantity(tagRecord.surplusGwh, "de", 1)} GWh Überschuss`
      : "Kein Überschuss.";

  return (
    <div className="v4-start start-page">
      <AuffaelligkeitKopf
        dayKey={kopfDayKey}
        dataStand={dataStand}
        result={auff}
        records={auffaelligkeitRecords}
        dispatch={dispatch}
      />

      <section className="v4-chapter" aria-labelledby="kapitel-tag">
        <div className="v4-chapter-head mx-auto max-w-[1360px] px-5 md:px-8">
          <p className="v4-chapter-num num">01 · Der Tag</p>
          <h2 id="kapitel-tag" className="v4-chapter-h2">
            Was gestern im Stromnetz passiert ist
          </h2>
          <p className="v4-chapter-kern">{surplusLine}</p>
        </div>
        <HomeRing
          dispatch={dispatch}
          exampleDispatch={exampleDispatch}
          todayKey={todayKey}
          until={until}
          showHero={false}
          showMore={false}
        />
      </section>

      <section className="v4-chapter" aria-labelledby="kapitel-system">
        <div className="v4-chapter-head mx-auto max-w-[1360px] px-5 md:px-8">
          <p className="v4-chapter-num num">02 · Das System</p>
          <h2 id="kapitel-system" className="v4-chapter-h2">
            Was Speicher in den letzten 30 Tagen geschafft hätten
          </h2>
          {absorbedShare != null ? (
            <p className="v4-chapter-kern num">
              {formatQuantity(absorbedShare * 100, "de", 0)}&nbsp;%
              <span className="v4-chapter-kern-sub">
                {" "}
                des Überschusses hätte die heutige Flotte ({formatQuantity(fleet.powerGw, "de", 2)} GW,{" "}
                {formatQuantity(fleet.energyGwh, "de", 2)} GWh) aufgenommen. Modellschätzung.
              </span>
            </p>
          ) : null}
        </div>
        <Uebersicht
          bundle={overviews}
          until={until}
          hideLeadAssessment
          hidePeriodTabs
          chapterMode
          overviewTitle="Was Speicher in den letzten 30 Tagen geschafft hätten"
        />
      </section>

      <section className="v4-chapter" aria-labelledby="kapitel-ort">
        <div className="v4-chapter-head mx-auto max-w-[1360px] px-5 md:px-8">
          <p className="v4-chapter-num num">03 · Der Ort</p>
          <h2 id="kapitel-ort" className="v4-chapter-h2">
            Ob das dem Netz hilft, entscheidet sich vor Ort
          </h2>
          <p className="v4-chapter-kern num">
            120 kW Spitze · 90 kW Anschluss
            <span className="v4-chapter-kern-sub"> Beispieldaten Supermarkt</span>
          </p>
        </div>
        <ConnectionStory hideEuro />
        <div className="mx-auto max-w-[1360px] px-5 pb-16 md:px-8">
          <PerspectiveChoice language="de" />
        </div>
      </section>
    </div>
  );
}
