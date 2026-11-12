"use client";

import { LueckeChart } from "@/components/home/LueckeChart";
import { PreisFenster } from "@/components/home/PreisFenster";
import type { PreisTick } from "@/lib/preisFenster";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import { formatQuantity } from "@/lib/formatQuantity";
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
}: {
  day: ResidualDay;
  peakGw: number | null;
  peakAt: string | null;
  useTagDateHeading?: boolean;
  prices?: PreisTick[];
  powerGw?: number;
  energyGwh?: number;
  surplusGwh?: number;
}) {
  const dayLabel = formatBerlinDayLabel(day.dateBerlin);
  const chapterTitle = useTagDateHeading
    ? `Was am ${dayLabel} im Stromnetz passiert ist`
    : "Was gestern im Stromnetz passiert ist";

  const kernSurplus =
    surplusGwh >= 0.05
      ? `${formatQuantity(surplusGwh, "de", 1)} GWh`
      : "< 0,05 GWh";
  const lead =
    peakGw !== null && peakAt
      ? `Abendspitze der Residuallast ${formatQuantity(peakGw, "de", 1)} GW um ${peakAt} Uhr.`
      : "Wind und Sonne decken den Verbrauch nicht durchgehend — die Lücke füllen andere Quellen.";

  return (
    <section className="v4-chapter" aria-labelledby="kapitel-tag">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">01 · Der Tag</p>
        <h2 id="kapitel-tag" className="v4-chapter-h2">
          {chapterTitle}
        </h2>
        <p className="v4-tag-kern">{kernSurplus}</p>
        <p className="v4-tag-side">{lead}</p>
      </div>
      <div className="v4-content v4-luecke-wrap">
        <LueckeChart slots={day.slots} peakGw={peakGw} peakAt={peakAt} />
      </div>
      {prices.length >= 2 ? (
        <div className="v4-content">
          <PreisFenster
            dateLabel={dayLabel}
            points={prices}
            powerGw={powerGw}
            energyGwh={energyGwh}
            surplusGwh={surplusGwh}
            compactCopy
          />
        </div>
      ) : null}
    </section>
  );
}
