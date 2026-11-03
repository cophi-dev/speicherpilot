"use client";

import Link from "next/link";
import { useMemo } from "react";

import { RangLeiste } from "@/components/home/RangLeiste";
import { TagChapter } from "@/components/home/TagChapter";
import { tagSurplusLine } from "@/lib/kopfTagCopy";
import { formatQuantity } from "@/lib/formatQuantity";
import type { AuffaelligkeitResult } from "@/lib/auffaelligkeit";
import { displayGw, kopfMetric, type TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import { prevBerlinDateKey } from "@/lib/berlinCalendar";
import { weekdayShort, formatBerlinDayLabel } from "@/lib/dayRingStory";
import type { ResidualDay } from "@/lib/windSolarResidual";

function kopfDataStand(dayKey: string, todayKey: string, liveStand: string): string {
  if (dayKey === prevBerlinDateKey(todayKey)) {
    return "06:00";
  }
  return liveStand;
}

function metricValue(record: TagesKennzahlRecord, key: string): number | null {
  switch (key) {
    case "evening_peak_gw":
      return record.eveningPeakGw;
    case "spread":
      return record.spread;
    case "ws_share":
      return record.wsShare;
    case "surplus_gwh":
      return record.surplusGwh;
    default:
      return record.eveningPeakGw;
  }
}

export function AuffaelligkeitKopf({
  dayKey,
  todayKey,
  dataStand,
  result,
  records,
}: {
  dayKey: string;
  todayKey: string;
  dataStand: string;
  result: AuffaelligkeitResult;
  records: TagesKennzahlRecord[];
}) {
  const record = records.find((r) => r.dateKey === dayKey);
  const winner = kopfMetric(records, dayKey);
  const metricKey = result.kind === "metric" ? result.key : winner?.key ?? "evening_peak_gw";
  const stand = kopfDataStand(dayKey, todayKey, dataStand);
  const kicker = `Gestern · ${weekdayShort(dayKey, "de")}, ${formatBerlinDayLabel(dayKey)} · Datenstand ${stand}`;

  const bars = useMemo(() => {
    const idx = records.findIndex((r) => r.dateKey === dayKey);
    if (idx < 0) {
      return [];
    }
    const slice = records.slice(Math.max(0, idx - 30), idx + 1);
    return slice.map((r) => {
      const value = metricValue(r, metricKey);
      const highlight = r.dateKey === dayKey;
      const rankEntry = kopfMetric(records, r.dateKey);
      const recordBar = rankEntry?.rank === 1 && rankEntry.key === metricKey && !highlight;
      return { dateKey: r.dateKey, value, highlight, record: recordBar };
    });
  }, [dayKey, metricKey, records]);

  const rank =
    winner && winner.key === metricKey ? winner.rank : kopfMetric(records, dayKey)?.rank ?? null;

  const rankLabel =
    rank !== null && rank <= 3 ? `Platz ${rank} von 31 Tagen` : rank !== null ? `Platz ${rank} von 31 Tagen` : undefined;

  const kernGw =
    metricKey === "evening_peak_gw" ? record?.eveningPeakGw ?? null : metricKey === "surplus_gwh" ? record?.surplusGwh ?? null : null;

  const kernLabel =
    metricKey === "evening_peak_gw" && record
      ? `Abendspitze der Residuallast · ${record.eveningPeakAt ?? "—"} Uhr`
      : winner?.label ?? "Kernzahl";

  const priceLine =
    record?.pmin != null && record.pmax != null
      ? {
          label: "Börsenpreis gestern",
          value: `${formatQuantity(Math.round(record.pmin), "de", 0)}–${formatQuantity(Math.round(record.pmax), "de", 0)} €/MWh`,
        }
      : null;

  const showBigNumber = metricKey === "evening_peak_gw" && kernGw !== null;

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

        <div className="v4-kopf-hero">
          <div className="v4-kopf-zahl">
            {showBigNumber ? (
              <p className="v4-riesenzahl num" aria-hidden="true">
                {displayGw(kernGw).replace(" GW", "")}
                <span className="v4-riesenzahl-unit">GW</span>
              </p>
            ) : null}
            <div className="v4-kern-row num">
              <span>{kernLabel}</span>
              {rankLabel ? <span>{rankLabel}</span> : null}
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
          <RangLeiste bars={bars} metricLabel={kernLabel} rankLabel={undefined} />
        </div>
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
