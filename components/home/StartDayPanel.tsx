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
  return (
    <div className="v4-start-day-panel v4-content" data-testid="start-day-panel" data-day-key={kopfDayKey}>
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
          <p className="v4-start-day-label num">Überschuss</p>
        </div>
      </div>
    </div>
  );
}

export function StartDayFootnotes({
  panel,
  kopfDayKey,
  surplusLine,
  lastLine,
}: {
  panel: HomeDayPanelData;
  kopfDayKey: string;
  surplusLine: string;
  lastLine: string | null;
}) {
  const dayLabel = formatBerlinDayLabel(kopfDayKey);
  const wd = weekdayShort(kopfDayKey, "de");

  const fleetLine = `Referenzflotte ${formatQuantity(panel.model.powerGw, "de", 2)} GW / ${formatQuantity(panel.model.energyGwh, "de", 2)} GWh.`;
  const chargeLine = `Geladen ${formatPanelGwh(panel.model.chargedGwh)} GWh, abgegeben ${formatPanelGwh(panel.model.dischargedGwh)} GWh.`;
  const modelNote =
    panel.model.unavailableReasonDe && panel.model.unavailableReasonDe.length <= 70
      ? panel.model.unavailableReasonDe
      : "Für diesen Tag nicht verfügbar.";

  return (
    <footer className="v4-content v4-day-footnotes" data-testid="start-day-footnotes">
      <dl className="v4-day-notes">
        <div>
          <dt>Formel</dt>
          <dd data-testid="start-day-surplus-headline">{surplusLine}</dd>
          <dd>Wind und Sonne über der Last, je Viertelstunde.</dd>
          <dd>Σ max(0, Wind+Sonne−Last)×¼h.</dd>
        </div>
        <div>
          <dt>Daten</dt>
          <dd data-testid="start-day-meta">
            {wd}, {dayLabel} · Energy-Charts · {panel.fetchStand}
          </dd>
          {lastLine ? <dd>{lastLine}</dd> : null}
        </div>
        <div>
          <dt>Modell</dt>
          {panel.model.available ? (
            <>
              <dd data-testid="start-day-model-fleet">{fleetLine}</dd>
              <dd>{chargeLine}</dd>
              <dd>Hypothetisch.</dd>
            </>
          ) : (
            <dd data-testid="start-day-model-fleet">{modelNote}</dd>
          )}
        </div>
        <div>
          <dt>Netz</dt>
          <dd>Lokale Netzwirkung: nicht bewertet.</dd>
          <dd>
            <Link href="/methodik#auffaelligkeit" className="v4-footnote-link">
              Methodik
            </Link>
          </dd>
        </div>
      </dl>
      <details className="v4-start-day-model-disclosure">
        <summary>Annahmen und Zeiträume</summary>
        <p>{panel.model.disclosureDe}</p>
      </details>
    </footer>
  );
}
