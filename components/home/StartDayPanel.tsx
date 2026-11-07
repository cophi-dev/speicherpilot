"use client";

import Link from "next/link";

import { formatBerlinDayLabel, weekdayShort } from "@/lib/dayRingStory";
import { formatQuantity } from "@/lib/formatQuantity";
import type { HomeDayPanelData } from "@/lib/homeDayPanel";

function gwhValue(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return formatQuantity(value, "de", 1);
}

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
  const dayLabel = formatBerlinDayLabel(kopfDayKey);
  const wd = weekdayShort(kopfDayKey, "de");

  return (
    <div className="v4-start-day-panel v4-content" data-testid="start-day-panel" data-day-key={kopfDayKey}>
      <div className="v4-start-day-hairline" aria-hidden="true" />
      <p className="v4-start-day-meta num" data-testid="start-day-meta">
        Daten: {wd}, {dayLabel} · Quelle: Energy-Charts · Abrufstand: {panel.fetchStand}
      </p>

      <p className="v4-start-day-section num">Beobachtet</p>
      <div className="v4-start-day-stats" role="list">
        <div className="v4-start-day-stat" role="listitem">
          <StatValue value={gwhValue(panel.observed.loadGwh)} unit="GWh" id="start-day-load" />
          <p className="v4-start-day-label num">Verbrauch</p>
        </div>
        <div className="v4-start-day-stat v4-start-day-stat-gen" role="listitem">
          <StatValue
            value={
              panel.observed.generationStatus === "ok"
                ? gwhValue(panel.observed.generationGwh)
                : panel.observed.generationStatus === "partial"
                  ? "offen"
                  : "—"
            }
            unit={panel.observed.generationStatus === "ok" ? "GWh" : ""}
            id="start-day-generation"
          />
          <p className="v4-start-day-label num">Erzeugung gesamt</p>
          <p className="v4-start-day-sub num" title={panel.observed.generationDetailDe}>
            Wind+Sonne: {gwhValue(panel.observed.windSolarGwh)} GWh
          </p>
        </div>
        <div className="v4-start-day-stat v4-start-day-stat-surplus" role="listitem">
          <StatValue
            value={gwhValue(panel.observed.surplusGwh)}
            unit="GWh"
            accent
            id="start-day-surplus"
          />
          <p className="v4-start-day-label num">
            Überschuss
            <span className="v4-start-day-label-hint">
              {" "}
              ·{" "}
              <Link href="/methodik#auffaelligkeit" className="v4-start-day-tooltip-link">
                Σ positive Viertelstunden
              </Link>
            </span>
          </p>
        </div>
      </div>

      <div className="v4-start-day-model">
        <p className="v4-start-day-section num">Modell</p>
        <p className="v4-start-day-model-params num" data-testid="start-day-model-params">
          ×{panel.model.factor} · {formatQuantity(panel.model.powerGw, "de", 2)} GW /{" "}
          {formatQuantity(panel.model.energyGwh, "de", 2)} GWh · {panel.model.drivingModeDe} ·{" "}
          {panel.model.rtePct}&nbsp;% RTE · {panel.model.fleetSourceDe}
        </p>
        {panel.model.available ? (
          <p className="v4-start-day-model-energy num" data-testid="start-day-model-energy">
            Geladen im Modell: {gwhValue(panel.model.chargedGwh)} GWh · Abgegeben im Modell:{" "}
            {gwhValue(panel.model.dischargedGwh)} GWh
          </p>
        ) : (
          <p className="v4-start-day-model-energy num">{panel.model.unavailableReasonDe}</p>
        )}
        <p className="v4-start-day-model-note num">{panel.model.windowNoteDe}</p>
        <p className="v4-start-day-local num">
          Lokale Netzwirkung: nicht bewertet ·{" "}
          <Link href="/methodik#beispiele" className="v4-text-link">
            Musterorte
          </Link>{" "}
          ·{" "}
          <Link href="/methodik" className="v4-text-link">
            Methodik
          </Link>
        </p>
      </div>
      <div className="v4-start-day-hairline" aria-hidden="true" />
    </div>
  );
}
