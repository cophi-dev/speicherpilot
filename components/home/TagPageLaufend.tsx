"use client";

import { TagDayNav } from "@/components/home/TagDayNav";
import { LiveTagPreisPanel } from "@/components/home/LiveTagPreisPanel";
import { LiveTagResidualChart } from "@/components/home/LiveTagResidualChart";
import { formatBerlinDayLabel, weekdayShort } from "@/lib/dayRingStory";
import type { LiveTagView } from "@/lib/liveTagView.server";

export function TagPageLaufend({ view }: { view: LiveTagView }) {
  const dayLabel = formatBerlinDayLabel(view.dayKey);

  return (
    <div className="v4-start">
      <TagDayNav dayKey={view.dayKey} lastCompleteDayKey={view.lastCompleteDayKey} />
      <section className="v4-kopf" aria-labelledby="live-tag-h1">
        <div className="v4-kopf-inner v4-content">
          <p className="v4-kicker num">
            Tag · {weekdayShort(view.dayKey, "de")}, {dayLabel}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="num inline-flex items-center gap-2 rounded-sm border border-border bg-card px-2 py-1 text-[12px] tracking-[0.06em] uppercase">
              <span className="inline-block size-1.5 animate-pulse rounded-full bg-primary" aria-hidden />
              läuft · Stand {view.dataStandHm} MEZ
            </span>
            <span className="num rounded-sm border border-border bg-secondary px-2 py-1 text-[12px] tracking-[0.06em] text-muted-foreground uppercase">
              vorläufig
            </span>
            {view.dataDelayed ? (
              <span className="num text-[12px] text-destructive">Daten verzögert</span>
            ) : null}
          </div>
          <h1 id="live-tag-h1" className="v4-h1 mt-4">
            {weekdayShort(view.dayKey, "de")}, {dayLabel}: der Tag läuft noch
          </h1>
          <p className="v4-subline mt-3">
            Werte der letzten Stunden sind vorläufig, der Tag wird morgen früh endgültig. Kein Rang, keine Auffälligkeit,
            keine Überschuss-Aussage für heute.
          </p>
        </div>
      </section>
      <section className="v4-chapter" aria-labelledby="live-tag-rest">
        <div className="v4-chapter-head v4-content">
          <p className="v4-chapter-num num">01 · Residuallast</p>
          <h2 id="live-tag-rest" className="v4-chapter-h2">
            Restlast bis Stand {view.dataStandHm}
          </h2>
        </div>
        <div className="v4-content v4-luecke-wrap">
          <LiveTagResidualChart plausibility={view.plausibility} />
        </div>
      </section>
      <LiveTagPreisPanel
        dayKey={view.dayKey}
        prices={view.preisToday}
        tomorrowKey={view.tomorrowKey}
        tomorrowPrices={view.preisTomorrow}
        marktFahrplan={view.marktFahrplan}
        fleetPowerGw={view.fleetPowerGw}
        fleetEnergyGwh={view.fleetEnergyGwh}
      />
    </div>
  );
}