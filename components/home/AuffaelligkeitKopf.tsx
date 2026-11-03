"use client";

import Link from "next/link";
import { useMemo } from "react";

import { RangLeiste } from "@/components/home/RangLeiste";
import { TagChapter } from "@/components/home/TagChapter";
import { tagSurplusLine } from "@/lib/kopfTagCopy";
import type { AuffaelligkeitResult } from "@/lib/auffaelligkeit";
import { kopfMetric, type TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import { prevBerlinDateKey } from "@/lib/berlinCalendar";
import { weekdayShort, formatBerlinDayLabel } from "@/lib/dayRingStory";
import { barValue, kopfHero } from "@/lib/kopfHero";
import { formatQuantity } from "@/lib/formatQuantity";
import type { ResidualDay } from "@/lib/windSolarResidual";

function kopfDataStand(dayKey: string, todayKey: string, liveStand: string): string {
  if (dayKey === prevBerlinDateKey(todayKey)) {
    return "06:00";
  }
  return liveStand;
}

export function AuffaelligkeitKopf({
  dayKey,
  todayKey,
  dataStand,
  result,
  records,
  kickerPrefix = "Gestern",
}: {
  dayKey: string;
  todayKey: string;
  dataStand: string;
  result: AuffaelligkeitResult;
  records: TagesKennzahlRecord[];
  kickerPrefix?: string;
}) {
  const record = records.find((r) => r.dateKey === dayKey);
  const winner = result.kind === "metric" ? kopfMetric(records, dayKey) : null;
  const metricKey = result.kind === "metric" ? result.key : null;
  const stand = kopfDataStand(dayKey, todayKey, dataStand);
  const kicker = `${kickerPrefix} · ${weekdayShort(dayKey, "de")}, ${formatBerlinDayLabel(dayKey)} · Datenstand ${stand}`;

  const hero = record && winner && metricKey === winner.key ? kopfHero(record, winner) : null;

  const bars = useMemo(() => {
    if (!metricKey) {
      return [];
    }
    const idx = records.findIndex((r) => r.dateKey === dayKey);
    if (idx < 0) {
      return [];
    }
    const slice = records.slice(Math.max(0, idx - 30), idx + 1);
    return slice.map((r) => {
      const value = barValue(r, metricKey);
      const highlight = r.dateKey === dayKey;
      const w = kopfMetric(records, r.dateKey);
      const recordBar = w?.rank === 1 && w.key === metricKey && !highlight;
      return { dateKey: r.dateKey, value, highlight, record: recordBar };
    });
  }, [dayKey, metricKey, records]);

  const priceLine =
    record?.pmin != null && record.pmax != null && metricKey !== "spread"
      ? {
          label: "Börsenpreis gestern",
          value: `${formatQuantity(Math.round(record.pmin), "de", 0)}–${formatQuantity(Math.round(record.pmax), "de", 0)} €/MWh`,
        }
      : metricKey === "spread" && record?.spread != null
        ? {
            label: "Spanne gestern",
            value: `${formatQuantity(Math.round(record.pmin ?? 0), "de", 0)}–${formatQuantity(Math.round(record.pmax ?? 0), "de", 0)} €/MWh`,
          }
        : null;

  return (
    <section className="v4-kopf" aria-labelledby="auffaelligkeit-h1">
      <div className="v4-kopf-inner v4-content">
        <p className="v4-kicker num">{kicker}</p>
        <div className="v4-kopf-intro">
          <h1 id="auffaelligkeit-h1" className="v4-h1">
            {result.kopfH1}
          </h1>
          {result.kopfSubline ? (
            <div className="v4-kopf-subgrid">
              <p className="v4-subline">{result.kopfSubline}</p>
              {priceLine ? (
                <div className="v4-preis-block">
                  <p className="v4-preis-label num">{priceLine.label}</p>
                  <p className="v4-preis-value num">{priceLine.value}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {hero ? (
          <div className="v4-kopf-hero">
            <div className="v4-kopf-zahl">
              <p className="v4-riesenzahl num" aria-hidden="true">
                {hero.value}
                <span className="v4-riesenzahl-unit">{hero.unit}</span>
              </p>
              <div className="v4-kern-row num">
                <span>{hero.kernLabel}</span>
                {hero.rankLabel ? <span>{hero.rankLabel}</span> : null}
              </div>
              <div className="v4-kopf-links">
                <Link href={`/tag/${dayKey}`} className="v4-text-link">
                  Tag ansehen →
                </Link>
                <Link href="/methodik#auffaelligkeit" className="v4-text-link">
                  Wie die Auffälligkeit gewählt wird
                </Link>
              </div>
            </div>
            <RangLeiste bars={bars} metricLabel={hero.kernLabel} rankLabel={undefined} />
          </div>
        ) : (
          <div className="v4-kopf-links v4-kopf-links-standalone">
            <Link href={`/tag/${dayKey}`} className="v4-text-link">
              Tag ansehen →
            </Link>
            <Link href="/methodik#auffaelligkeit" className="v4-text-link">
              Wie die Auffälligkeit gewählt wird
            </Link>
          </div>
        )}
        <p className="v4-kopf-chapter-foot num">01 · Der Tag</p>
      </div>
    </section>
  );
}

export function TagPageV4({
  dayKey,
  todayKey,
  dataStand,
  result,
  records,
  day,
  lastSurplusKey,
}: {
  dayKey: string;
  todayKey: string;
  dataStand: string;
  result: AuffaelligkeitResult;
  records: TagesKennzahlRecord[];
  day: ResidualDay;
  lastSurplusKey: string | null;
}) {
  const record = records.find((r) => r.dateKey === dayKey);
  return (
    <div className="v4-start">
      <AuffaelligkeitKopf
        dayKey={dayKey}
        todayKey={todayKey}
        dataStand={dataStand}
        result={result}
        records={records}
        kickerPrefix="Tag"
      />
      <TagChapter
        day={day}
        lastSurplusKey={lastSurplusKey}
        surplusLine={tagSurplusLine(record?.surplusGwh ?? 0)}
        peakGw={record?.eveningPeakGw ?? null}
        peakAt={record?.eveningPeakAt ?? null}
      />
    </div>
  );
}
