"use client";

import { FnRef, START_NOTE } from "@/components/home/StartAnmerkungen";
import { formatPanelGwh } from "@/lib/homeDayGwhDisplay";
import type { HomeDayPanelData } from "@/lib/homeDayPanel";

function StatValue({
  value,
  unit,
  accent,
  id,
}: {
  value: string;
  unit: string;
  accent?: boolean;
  id?: string;
}) {
  return (
    <p className={`v4-start-day-value num${accent ? " is-accent" : ""}`} id={id}>
      {value}
      <span className="v4-start-day-unit">{unit}</span>
    </p>
  );
}

export function StartDayPanel({ panel, kopfDayKey }: { panel: HomeDayPanelData; kopfDayKey: string }) {
  return (
    <div className="v4-start-day-panel v4-content" data-testid="start-day-panel" data-day-key={kopfDayKey}>
      <p className="v4-start-day-section num">
        Beobachtet
        <FnRef n={START_NOTE.daten} />
      </p>
      <div className="v4-start-day-stats" role="list">
        <div className="v4-start-day-stat" role="listitem">
          <StatValue value={formatPanelGwh(panel.observed.loadGwh)} unit="GWh" id="start-day-load" />
          <p className="v4-start-day-label num">Verbrauch</p>
        </div>
        <div className="v4-start-day-stat v4-start-day-stat-gen" role="listitem">
          <StatValue
            value={
              panel.observed.generationStatus === "ok"
                ? formatPanelGwh(panel.observed.generationGwh)
                : panel.observed.generationStatus === "partial"
                  ? "offen"
                  : "—"
            }
            unit={panel.observed.generationStatus === "ok" ? "GWh" : ""}
            id="start-day-generation"
          />
          <p className="v4-start-day-label num" title={panel.observed.generationDetailDe}>
            Erzeugung gesamt
          </p>
          <p className="v4-start-day-sub num" title={panel.observed.generationDetailDe}>
            Wind + Sonne: {formatPanelGwh(panel.observed.windSolarGwh)} GWh
          </p>
        </div>
        <div className="v4-start-day-stat v4-start-day-stat-ws" role="listitem">
          <p className="v4-start-day-ws-value num" id="start-day-wind-solar">
            {formatPanelGwh(panel.observed.windSolarGwh)}
          </p>
          <p className="v4-start-day-label num">Wind + Sonne</p>
        </div>
        <div className="v4-start-day-stat v4-start-day-stat-surplus" role="listitem">
          <StatValue
            value={formatPanelGwh(panel.observed.surplusGwh, { surplusBand: true })}
            unit={panel.observed.surplusGwh === null ? "" : "GWh"}
            accent
            id="start-day-surplus"
          />
          <p className="v4-start-day-label num">
            Überschuss
            <FnRef n={START_NOTE.ueberschuss} />
          </p>
        </div>
      </div>
    </div>
  );
}
