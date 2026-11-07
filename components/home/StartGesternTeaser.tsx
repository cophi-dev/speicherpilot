"use client";

import Link from "next/link";

import { LueckeChart } from "@/components/home/LueckeChart";
import { StartDayPanel } from "@/components/home/StartDayPanel";
import {
  tagSurplusLine,
  tagLastSurplusLine,
  tagSurplusDefinitionLine,
  lastSurplusBefore,
} from "@/lib/kopfTagCopy";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import type { HomeDayPanelData } from "@/lib/homeDayPanel";
import type { ResidualDay } from "@/lib/windSolarResidual";

export function StartGesternTeaser({
  kopfDayKey,
  record,
  day,
  panel,
  records,
}: {
  kopfDayKey: string;
  record: TagesKennzahlRecord | undefined;
  day: ResidualDay | null;
  panel: HomeDayPanelData | null;
  records: TagesKennzahlRecord[];
}) {
  const label = formatBerlinDayLabel(kopfDayKey);
  const surplus =
    record != null
      ? tagSurplusLine(record.surplusGwh)
      : "Überschuss-Kennzahl für diesen Tag nicht verfügbar.";
  const lastSurplus = lastSurplusBefore(records, kopfDayKey);
  const lastLine = tagLastSurplusLine(lastSurplus);
  const peakGw = record?.eveningPeakGw ?? null;
  const peakAt = record?.eveningPeakAt ?? null;

  return (
    <section className="v4-chapter" aria-labelledby="kapitel-gestern">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">01 · Tagesübersicht</p>
        <h2 id="kapitel-gestern" className="v4-chapter-h2">
          Was am {label} im Stromnetz passiert ist
        </h2>
        <p className="v4-tag-kern" data-testid="start-day-surplus-headline">
          {surplus}
        </p>
        <p className="v4-tag-side v4-tag-side-supplement-desktop">{tagSurplusDefinitionLine()}</p>
        {lastLine ? <p className="v4-tag-side v4-tag-side-supplement-desktop">{lastLine}</p> : null}
      </div>

      {panel ? <StartDayPanel panel={panel} kopfDayKey={kopfDayKey} /> : null}

      {day ? (
        <div className="v4-content v4-luecke-wrap" data-testid="start-day-chart">
          <LueckeChart slots={day.slots} peakGw={peakGw} peakAt={peakAt} />
        </div>
      ) : null}

      <details className="v4-content v4-tag-side-supplement">
        <summary>Klarstellung zur Überschuss-Kennzahl</summary>
        <p className="v4-tag-side">{tagSurplusDefinitionLine()}</p>
        {lastLine ? <p className="v4-tag-side">{lastLine}</p> : null}
      </details>

      <p className="v4-chapter-foot v4-content num">
        <Link href={`/tag/${kopfDayKey}`} className="v4-text-link">
          Tag {label} vertiefen →
        </Link>
      </p>
    </section>
  );
}
