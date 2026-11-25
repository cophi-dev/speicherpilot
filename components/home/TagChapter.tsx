"use client";

import { GraphScopeMeta } from "@/components/home/GraphScopeMeta";
import { LueckeChart } from "@/components/home/LueckeChart";
import { PreisFenster } from "@/components/home/PreisFenster";
import type { PreisTick } from "@/lib/preisFenster";
import { formatDeGwh, formatDeGw, insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";

const NBSP = "\u00a0";
import type { ResidualDay } from "@/lib/windSolarResidual";

export function TagChapter({
  day,
  peakGw,
  peakAt,
  useTagDateHeading = false,
  prices = [],
  powerGw = 0,
  energyGwh = 0,
  surplusGwh = 0,
  isStartSurface = false,
}: {
  day: ResidualDay;
  peakGw: number | null;
  peakAt: string | null;
  useTagDateHeading?: boolean;
  prices?: PreisTick[];
  powerGw?: number;
  energyGwh?: number;
  surplusGwh?: number;
  isStartSurface?: boolean;
}) {
  const dayLabel = formatBerlinDayLabel(day.dateBerlin);
  const chapterTitle = useTagDateHeading
    ? `Was am ${dayLabel} im Stromnetz passiert ist`
    : "Was gestern im Stromnetz passiert ist";

  const hasSurplus = surplusGwh >= 0.05;
  const kernSurplus = hasSurplus
    ? `Überschuss: ${formatDeGwh(surplusGwh, 1)}`
    : `Überschuss: unter 0,05${NBSP}GWh`;
  const leadRaw =
    peakGw !== null && peakAt
      ? hasSurplus
        ? `Die Restlast erreichte abends ${formatDeGw(peakGw, 1)} um ${peakAt}\u00a0Uhr.`
        : `Wind und Sonne lagen den ganzen Tag unter dem Verbrauch. Die Restlast (Verbrauch minus Wind und Sonne) erreichte ${formatDeGw(peakGw, 1)} um ${peakAt}\u00a0Uhr.`
      : "Wind und Sonne decken den Verbrauch nicht durchgehend — die Lücke füllen andere Quellen.";
  const lead = insertDisplayUnitNbsp(leadRaw);

  return (
    <section className="v4-chapter" aria-labelledby="kapitel-tag">
      <div className="v4-chapter-head v4-content">
        {isStartSurface ? (
          <>
            <div className="v4-chapter-title-row">
              <h2 id="kapitel-tag" className="v4-chapter-h2">
                {chapterTitle}
              </h2>
              <p className="v4-chapter-num num">01 · Der Tag</p>
            </div>
            <div className="v4-chapter-lead-grid">
              <p className="v4-tag-kern">{kernSurplus}</p>
              <p className="v4-tag-side">{lead}</p>
            </div>
          </>
        ) : (
          <>
            <p className="v4-chapter-num num">01 · Der Tag</p>
            <h2 id="kapitel-tag" className="v4-chapter-h2">
              {chapterTitle}
            </h2>
            <p className="v4-tag-kern">{kernSurplus}</p>
            <p className="v4-tag-side">{lead}</p>
          </>
        )}
      </div>
      <div className={`v4-content v4-luecke-wrap${isStartSurface ? " v4-chart-stage" : ""}`}>
        <div className={isStartSurface ? "v4-chart-plate" : undefined}>
          <LueckeChart slots={day.slots} peakGw={peakGw} peakAt={peakAt} />
          <GraphScopeMeta />
        </div>
      </div>
      {prices.length >= 2 ? (
        <div className={`v4-content${isStartSurface ? " v4-chart-stage" : ""}`}>
          <div className={isStartSurface ? "v4-chart-plate" : undefined}>
            <PreisFenster
              dateLabel={dayLabel}
              points={prices}
              powerGw={powerGw}
              energyGwh={energyGwh}
              surplusGwh={surplusGwh}
              compactCopy
            />
            <GraphScopeMeta />
          </div>
        </div>
      ) : null}
    </section>
  );
}
