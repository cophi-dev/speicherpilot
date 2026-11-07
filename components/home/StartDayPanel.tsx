"use client";

import Link from "next/link";

import { formatBerlinDayLabel, weekdayShort } from "@/lib/dayRingStory";
import { formatPanelGwh } from "@/lib/homeDayGwhDisplay";
import type { HomeDayPanelData } from "@/lib/homeDayPanel";
import { formatQuantity } from "@/lib/formatQuantity";

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

  const surplusDisplay = formatPanelGwh(panel.observed.surplusGwh, { surplusBand: true });
  const surplusUnit = panel.observed.surplusGwh === null ? "" : "GWh";

  return (
    <div className="v4-start-day-panel v4-content" data-testid="start-day-panel" data-day-key={kopfDayKey}>
      <div className="v4-start-day-hairline" aria-hidden="true" />
      <p className="v4-start-day-meta num" data-testid="start-day-meta">
        Daten: {wd}, {dayLabel} · Quelle: Energy-Charts · Abrufstand: {panel.fetchStand}
      </p>

      <p className="v4-start-day-section num">Beobachtet</p>
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
          <p className="v4-start-day-label num">Erzeugung gesamt</p>
          <p className="v4-start-day-sub num" title={panel.observed.generationDetailDe}>
            Wind + Sonne: {formatPanelGwh(panel.observed.windSolarGwh)} GWh
          </p>
        </div>
        <div className="v4-start-day-stat v4-start-day-stat-surplus" role="listitem">
          <StatValue value={surplusDisplay} unit={surplusUnit} accent id="start-day-surplus" />
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
        <p className="v4-start-day-model-line num" data-testid="start-day-model-fleet">
          Modell: Referenzflotte {formatQuantity(panel.model.powerGw, "de", 2)} GW /{" "}
          {formatQuantity(panel.model.energyGwh, "de", 2)} GWh
        </p>
        {panel.model.available ? (
          <p className="v4-start-day-model-line num" data-testid="start-day-model-energy">
            Geladen {formatPanelGwh(panel.model.chargedGwh)} GWh · Abgegeben{" "}
            {formatPanelGwh(panel.model.dischargedGwh)} GWh
          </p>
        ) : (
          <p className="v4-start-day-model-line num">{panel.model.unavailableReasonDe}</p>
        )}
        <p className="v4-start-day-model-line num">
          Lokale Netzwirkung: nicht bewertet ·{" "}
          <Link href="/methodik#auffaelligkeit" className="v4-start-day-tooltip-link">
            Methodik
          </Link>
        </p>
        <details className="v4-start-day-model-disclosure">
          <summary className="num">Modellannahmen und Zeiträume</summary>
          <p className="v4-start-day-disclosure-body num">{panel.model.disclosureDe}</p>
        </details>
      </div>
      <div className="v4-start-day-hairline" aria-hidden="true" />
    </div>
  );
}
