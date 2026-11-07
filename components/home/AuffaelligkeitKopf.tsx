"use client";

import Link from "next/link";
import { useMemo, type CSSProperties } from "react";

import { RangLeiste } from "@/components/home/RangLeiste";
import { TagOrtTeaser } from "@/components/home/OrtTeasers";
import { TagDayNav } from "@/components/home/TagDayNav";
import { TagSystemChapter } from "@/components/home/TagSystemChapter";
import { TagChapter } from "@/components/home/TagChapter";
import { tagSurplusLine } from "@/lib/kopfTagCopy";
import type { AuffaelligkeitResult } from "@/lib/auffaelligkeit";
import { kopfMetric, type TagesKennzahlRecord, weekdayLabelDe } from "@/lib/auffaelligkeit";
import { prevBerlinDateKey } from "@/lib/berlinCalendar";
import { weekdayShort, formatBerlinDayLabel } from "@/lib/dayRingStory";
import { barValue, kopfHero } from "@/lib/kopfHero";
import { formatQuantity } from "@/lib/formatQuantity";
import type { OverviewEvaluation } from "@/lib/overviewChain";
import { NationalFleetDayChapter } from "@/components/home/NationalFleetDayChapter";
import type { NationalFleetDaySlice, NationalFleetFactor, NationalFleetRunSeries, NationalFleetStrategyUi } from "@/lib/nationalMonthFleetModel";
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
  hideTagLink = false,
}: {
  dayKey: string;
  todayKey: string;
  dataStand: string;
  result: AuffaelligkeitResult;
  records: TagesKennzahlRecord[];
  kickerPrefix?: string;
  hideTagLink?: boolean;
}) {
  const record = records.find((r) => r.dateKey === dayKey);
  const winner = result.kind === "metric" ? kopfMetric(records, dayKey) : null;
  const metricKey = result.kind === "metric" ? result.key : null;
  const stand = kopfDataStand(dayKey, todayKey, dataStand);
  const kicker = `${kickerPrefix} · ${weekdayShort(dayKey, "de")}, ${formatBerlinDayLabel(dayKey)} · Datenstand ${stand}`;
  const dayLabel = formatBerlinDayLabel(dayKey);
  const isTagPage = kickerPrefix === "Tag";
  const isYesterday = dayKey === prevBerlinDateKey(todayKey);

  const seriePresentation = useMemo(() => {
    if (result.kind !== "serie" || !record) {
      return null;
    }
    const index = records.findIndex((r) => r.dateKey === dayKey);
    const lastSurplus = [...records.slice(0, index + 1)].reverse().find((d) => d.surplusGwh >= 0.05);
    const slice = records.slice(Math.max(0, index - 30), index + 1);
    const bars = slice.map((r) => ({
      dateKey: r.dateKey,
      value: r.surplusGwh >= 0.05 ? r.surplusGwh : 0,
      highlight: r.dateKey === dayKey,
      record: false,
      zero: r.surplusGwh < 0.05,
    }));
    return {
      h1: `${record.dryStreak}. Tag in Folge ohne Überschuss`,
      subline: lastSurplus
        ? `Zuletzt war am ${weekdayLabelDe(lastSurplus.dateKey)} Strom übrig. Speicher hatten im Modell seitdem nichts zum Laden.`
        : "Speicher hatten im Modell seitdem nichts zum Laden.",
      hero: {
        value: String(record.dryStreak),
        unit: "Tage",
        kernLabel: "ohne Überschuss",
      },
      bars,
    };
  }, [dayKey, record, records, result.kind]);

  const metricHero =
    record && winner && metricKey === winner.key && !seriePresentation ? kopfHero(record, winner) : null;

  const hero = useMemo(() => {
    if (seriePresentation) {
      return seriePresentation.hero;
    }
    return metricHero;
  }, [metricHero, seriePresentation]);

  const bars = useMemo(() => {
    if (seriePresentation) {
      return seriePresentation.bars;
    }
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
  }, [dayKey, metricKey, records, seriePresentation]);

  const rawKopfH1 = seriePresentation?.h1 ?? result.kopfH1;
  const kopfSubline = seriePresentation?.subline ?? result.kopfSubline;
  const kopfH1 = isTagPage
    ? `${weekdayShort(dayKey, "de")}, ${dayLabel} — ${rawKopfH1}`
    : rawKopfH1;

  const priceSpreadLabel = isTagPage
    ? `Spanne am ${dayLabel}`
    : isYesterday
      ? "Spanne gestern"
      : `Spanne am ${dayLabel}`;
  const priceDayLabel = isTagPage
    ? `Börsenpreis am ${dayLabel}`
    : isYesterday
      ? "Börsenpreis gestern"
      : `Börsenpreis am ${dayLabel}`;

  const priceLine =
    record?.pmin != null && record.pmax != null && metricKey !== "spread"
      ? {
          label: priceDayLabel,
          value: `${formatQuantity(Math.round(record.pmin), "de", 0)}–${formatQuantity(Math.round(record.pmax), "de", 0)} €/MWh`,
        }
      : metricKey === "spread" && record?.spread != null
        ? {
            label: priceSpreadLabel,
            value: `${formatQuantity(Math.round(record.pmin ?? 0), "de", 0)}–${formatQuantity(Math.round(record.pmax ?? 0), "de", 0)} €/MWh`,
          }
        : null;

  const methodikLink = (
    <Link href="/methodik#auffaelligkeit" className="v4-text-link">
      Wie die Auffälligkeit gewählt wird
    </Link>
  );

  return (
    <section className="v4-kopf" aria-labelledby="auffaelligkeit-h1">
      <div className="v4-kopf-inner v4-content">
        <p className="v4-kicker num">{kicker}</p>
        <div className="v4-kopf-intro">
          <h1 id="auffaelligkeit-h1" className="v4-h1">
            {kopfH1}
          </h1>
          {kopfSubline ? (
            <div className="v4-kopf-subgrid">
              <p className="v4-subline">{kopfSubline}</p>
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
              <p
                className="v4-riesenzahl num"
                aria-hidden="true"
                style={
                  {
                    "--v4-ries-ch": String(hero.value.length + Math.ceil(hero.unit.length * 0.45)),
                  } as CSSProperties
                }
              >
                {hero.value}
                <span className="v4-riesenzahl-unit">{hero.unit}</span>
              </p>
              <div className="v4-kern-row num">
                <span>{hero.kernLabel}</span>
                {metricHero?.rankLabel ? <span>{metricHero.rankLabel}</span> : null}
              </div>
              <div className="v4-kopf-links">
                {!hideTagLink && !isTagPage ? (
                  <Link href={`/tag/${dayKey}`} className="v4-text-link">
                    Tag ansehen →
                  </Link>
                ) : null}
                {methodikLink}
              </div>
            </div>
            <RangLeiste
              bars={bars}
              metricLabel={hero.kernLabel}
              rankLabel={seriePresentation ? "Überschuss je Tag" : undefined}
            />
          </div>
        ) : (
          <div className="v4-kopf-links v4-kopf-links-standalone">
            {!hideTagLink && !isTagPage ? (
              <Link href={`/tag/${dayKey}`} className="v4-text-link">
                Tag ansehen →
              </Link>
            ) : null}
            {methodikLink}
          </div>
        )}
      </div>
    </section>
  );
}

export function TagPageV4({
  dayKey,
  todayKey,
  lastCompleteDayKey,
  dataStand,
  result,
  records,
  day,
  lastSurplusKey,
  dayOverview,
  fleetPowerGw,
  fleetEnergyGwh,
  fleetDay,
}: {
  dayKey: string;
  todayKey: string;
  lastCompleteDayKey: string;
  dataStand: string;
  result: AuffaelligkeitResult;
  records: TagesKennzahlRecord[];
  day: ResidualDay;
  lastSurplusKey: string | null;
  dayOverview: OverviewEvaluation | null;
  fleetPowerGw: number;
  fleetEnergyGwh: number;
  fleetDay?: {
    run: NationalFleetRunSeries;
    slice: NationalFleetDaySlice;
    factor: NationalFleetFactor;
    strategy: NationalFleetStrategyUi;
  } | null;
}) {
  const record = records.find((r) => r.dateKey === dayKey);
  if (!record) {
    return null;
  }
  return (
    <div className="v4-start">
      <TagDayNav dayKey={dayKey} lastCompleteDayKey={lastCompleteDayKey} />
      <AuffaelligkeitKopf
        dayKey={dayKey}
        todayKey={todayKey}
        dataStand={dataStand}
        result={result}
        records={records}
        kickerPrefix="Tag"
        hideTagLink
      />
      {fleetDay ? (
        <NationalFleetDayChapter
          dayKey={dayKey}
          factor={fleetDay.factor}
          strategy={fleetDay.strategy}
          run={fleetDay.run}
          slice={fleetDay.slice}
        />
      ) : null}
      <TagChapter
        day={day}
        lastSurplusKey={lastSurplusKey}
        surplusLine={tagSurplusLine(record.surplusGwh ?? 0)}
        peakGw={record.eveningPeakGw ?? null}
        peakAt={record.eveningPeakAt ?? null}
        todayKey={todayKey}
        useTagDateHeading
        showFooterLink={false}
      />
      <TagSystemChapter
        dayKey={dayKey}
        record={record}
        dayOverview={dayOverview}
        fleetPowerGw={fleetPowerGw}
        fleetEnergyGwh={fleetEnergyGwh}
        lastSurplusKey={lastSurplusKey}
      />
      <TagOrtTeaser dayLabel={formatBerlinDayLabel(dayKey)} />
    </div>
  );
}
