"use client";

import Link from "next/link";
import { useMemo, type CSSProperties } from "react";

import { RangLeiste } from "@/components/home/RangLeiste";
import { prevBerlinDateKey } from "@/lib/berlinCalendar";
import { berlinMonthKeyFromDateKey } from "@/lib/monatCalendar";
import { startPointe } from "@/lib/startPointe";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import { weekdayShort, formatBerlinDayLabel } from "@/lib/dayRingStory";
import { NATIONAL_FLEET_MONTH_KEY, fleetMonatHref } from "@/lib/nationalMonthFleetModel";

function kopfDataStand(dayKey: string, todayKey: string, liveStand: string): string {
  if (dayKey === prevBerlinDateKey(todayKey)) {
    return "06:00";
  }
  return liveStand;
}

export function StartKopf({
  kopfDayKey,
  todayKey,
  dataStand,
  records,
}: {
  kopfDayKey: string;
  todayKey: string;
  dataStand: string;
  records: TagesKennzahlRecord[];
}) {
  const pointe = useMemo(() => startPointe(records, kopfDayKey), [records, kopfDayKey]);
  const stand = kopfDataStand(kopfDayKey, todayKey, dataStand);
  const kicker = `Start · ${weekdayShort(kopfDayKey, "de")}, ${formatBerlinDayLabel(kopfDayKey)} · Datenstand ${stand}`;
  const monthKey = berlinMonthKeyFromDateKey(kopfDayKey);

  const bars = useMemo(() => {
    const idx = records.findIndex((r) => r.dateKey === kopfDayKey);
    const slice = records.slice(Math.max(0, idx - 29), idx + 1);
    return slice.map((r) => ({
      dateKey: r.dateKey,
      value: r.surplusGwh >= 0.05 ? r.surplusGwh : 0,
      highlight: r.dateKey === kopfDayKey,
      record: false,
      zero: r.surplusGwh < 0.05,
    }));
  }, [kopfDayKey, records]);

  return (
    <section className="v4-kopf" aria-labelledby="start-h1">
      <div className="v4-kopf-inner v4-content">
        <p className="v4-kicker num">{kicker}</p>
        <div className="v4-kopf-intro">
          <h1 id="start-h1" className="v4-h1">
            {pointe.h1}
          </h1>
          <p className="v4-subline">{pointe.subline}</p>
        </div>
        <div className="v4-kopf-hero">
          <div className="v4-kopf-zahl">
            <p
              className="v4-riesenzahl num"
              aria-hidden="true"
              style={
                {
                  "--v4-ries-ch": String(pointe.heroValue.length + Math.ceil(pointe.heroUnit.length * 0.45)),
                } as CSSProperties
              }
            >
              {pointe.heroValue}
              <span className="v4-riesenzahl-unit">{pointe.heroUnit}</span>
            </p>
            <div className="v4-kern-row num">
              <span>{pointe.heroKern}</span>
            </div>
          </div>
          <RangLeiste bars={bars} metricLabel="Überschuss je Tag" rankLabel="Überschuss je Tag" />
        </div>
        <div className="v4-kopf-links">
          <Link href={`/tag/${kopfDayKey}`} className="v4-text-link">
            Tag ansehen →
          </Link>
          <Link
            href={
              monthKey === NATIONAL_FLEET_MONTH_KEY
                ? fleetMonatHref(monthKey, 1, "ueberschuss")
                : `/monat/${monthKey}`
            }
            className="v4-text-link"
          >
            Monat ansehen →
          </Link>
          <Link href="/methodik#auffaelligkeit" className="v4-text-link">
            Wie die Auffälligkeit gewählt wird
          </Link>
        </div>
        {pointe.footnote ? <p className="v4-footnote v4-kopf-footnote">{pointe.footnote}</p> : null}
      </div>
    </section>
  );
}
