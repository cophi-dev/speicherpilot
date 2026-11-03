"use client";

import Link from "next/link";
import { useMemo } from "react";

import { DayRing } from "@/components/day-ring/DayRing";
import { RangLeiste } from "@/components/home/RangLeiste";
import { formatQuantity } from "@/lib/formatQuantity";
import type { AuffaelligkeitResult } from "@/lib/auffaelligkeit";
import { displayGw, scoreDay, type TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import { buildLiveDispatchStory, type LiveDispatchInput } from "@/lib/liveFleetDispatch";

export function AuffaelligkeitKopf({
  dayKey,
  dataStand,
  result,
  records,
  dispatch,
}: {
  dayKey: string;
  dataStand: string;
  result: AuffaelligkeitResult;
  records: TagesKennzahlRecord[];
  dispatch: LiveDispatchInput;
}) {
  const record = records.find((r) => r.dateKey === dayKey);
  const scored = scoreDay(records, dayKey);
  const metricKey = result.kind === "metric" ? result.key : "evening_peak_gw";

  const bars = useMemo(() => {
    const idx = records.findIndex((r) => r.dateKey === dayKey);
    if (idx < 0) {
      return [];
    }
    const slice = records.slice(Math.max(0, idx - 30), idx + 1);
    let bestKey = metricKey;
    let bestDir: "hoch" | "tief" = "hoch";
    if (metricKey === "evening_peak_gw" && scored?.[0]) {
      bestDir = scored.find((s) => s.key === "evening_peak_gw")?.dir ?? "hoch";
    }
    return slice.map((r) => {
      let value: number | null = null;
      switch (bestKey) {
        case "evening_peak_gw":
          value = r.eveningPeakGw;
          break;
        case "spread":
          value = r.spread;
          break;
        case "ws_share":
          value = r.wsShare;
          break;
        case "surplus_gwh":
          value = r.surplusGwh;
          break;
        default:
          value = r.eveningPeakGw;
      }
      const highlight = r.dateKey === dayKey;
      const rankEntry = scoreDay(records, r.dateKey)?.find((s) => s.key === bestKey);
      const recordBar = rankEntry?.rank === 1 && !highlight;
      return { dateKey: r.dateKey, value, highlight, record: recordBar };
    });
  }, [dayKey, metricKey, records, scored]);

  const story =
    dispatch.day && dispatch.fleet
      ? buildLiveDispatchStory({
          day: dispatch.day,
          fallback: dispatch.fallback,
          powerMw: dispatch.fleet.powerMw,
          energyMwh: dispatch.fleet.energyMwh,
          factor: 1,
        })
      : null;
  const rankLine =
    metricKey === "evening_peak_gw" && record
      ? `Platz ${scored?.find((s) => s.key === "evening_peak_gw")?.rank ?? "—"} von 31 Tagen`
      : undefined;

  const priceLine =
    record?.pmin != null && record.pmax != null
      ? `Börsenpreis gestern ${formatQuantity(Math.round(record.pmin), "de", 0)}–${formatQuantity(Math.round(record.pmax), "de", 0)} €/MWh`
      : null;

  const kernGw = record?.eveningPeakGw ?? null;
  const kernLabel =
    metricKey === "evening_peak_gw"
      ? `Abendspitze der Residuallast · ${record?.eveningPeakAt ?? "—"} Uhr`
      : metricKey === "spread"
        ? "Preisspanne Day-Ahead"
        : "Kernzahl";

  return (
    <section className="v4-kopf day-hero-screen" aria-labelledby="auffaelligkeit-h1">
      <div className="v4-kopf-inner mx-auto max-w-[1360px] px-5 md:px-8">
        <p className="v4-kicker num">
          Gestern · {formatBerlinDayLabel(dayKey)} · Datenstand {dataStand}
        </p>
        <h1 id="auffaelligkeit-h1" className="v4-h1">
          {result.headline}
        </h1>
        {result.subline ? <p className="v4-subline">{result.subline}</p> : null}

        <div className="v4-kopf-grid">
          <div className="v4-kopf-zahl">
            {metricKey === "evening_peak_gw" && kernGw !== null ? (
              <>
                <p className="v4-riesenzahl num" aria-hidden="true">
                  {displayGw(kernGw).replace(" GW", "")}
                  <span className="v4-riesenzahl-unit">GW</span>
                </p>
                <p className="v4-kern-label num">{kernLabel}</p>
              </>
            ) : null}
            <RangLeiste bars={bars} metricLabel={kernLabel} rankLabel={rankLine} />
            <div className="v4-kopf-links">
              <Link href={`/tag/${dayKey}`} className="v4-text-link">
                Tag ansehen →
              </Link>
              <Link href="/methodik#auffaelligkeit" className="v4-text-link">
                Wie die Auffälligkeit gewählt wird
              </Link>
            </div>
          </div>
          <div className="v4-kopf-side">
            {priceLine ? <p className="v4-preis num">{priceLine}</p> : null}
            {story ? (
              <div className="v4-kopf-ring">
                <DayRing
                  points={story.points}
                  label=""
                  description=""
                  showGwScale
                  showSoc={false}
                  showFlow={false}
                  chargedGwh={story.chargedGwh}
                  centerMark={null}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
