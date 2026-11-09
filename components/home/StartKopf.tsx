"use client";

import Link from "next/link";
import { useMemo, type CSSProperties } from "react";

import { RangLeiste } from "@/components/home/RangLeiste";
import { FnRef, START_NOTE } from "@/components/home/StartAnmerkungen";
import { prevBerlinDateKey } from "@/lib/berlinCalendar";
import { berlinMonthKeyFromDateKey } from "@/lib/monatCalendar";
import { formatQuantity } from "@/lib/formatQuantity";
import type { StartPointe } from "@/lib/startPointe";
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
  pointe,
}: {
  kopfDayKey: string;
  todayKey: string;
  dataStand: string;
  records: TagesKennzahlRecord[];
  pointe: StartPointe;
}) {
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

  const scale = useMemo(() => {
    if (bars.length === 0) {
      return undefined;
    }
    const max = Math.max(...bars.map((b) => b.value ?? 0));
    return {
      maxLabel: max > 0 ? `${formatQuantity(max, "de", 1)} GWh` : "0 GWh",
      startLabel: formatBerlinDayLabel(bars[0].dateKey).slice(0, 6),
      endLabel: formatBerlinDayLabel(bars[bars.length - 1].dateKey).slice(0, 6),
    };
  }, [bars]);

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
              <FnRef n={START_NOTE.auffaelligkeit} />
            </div>
          </div>
          <RangLeiste bars={bars} metricLabel="Überschuss je Tag" rankLabel="Überschuss je Tag" scale={scale} />
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
        </div>
      </div>
    </section>
  );
}
