import Link from "next/link";
import type { ReactNode } from "react";

import { formatBerlinDayLabel, weekdayShort } from "@/lib/dayRingStory";
import { formatPanelGwh } from "@/lib/homeDayGwhDisplay";
import type { HomeDayPanelData } from "@/lib/homeDayPanel";
import { formatQuantity } from "@/lib/formatQuantity";

export const START_NOTE = {
  auffaelligkeit: 1,
  daten: 2,
  ueberschuss: 3,
  system: 4,
} as const;

export function FnRef({ n }: { n: number }) {
  return (
    <sup className="v4-fn-ref">
      <a href={`#anm-${n}`} id={`anm-ref-${n}`} aria-label={`Anmerkung ${n}`}>
        {n}
      </a>
    </sup>
  );
}

function Note({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li id={`anm-${n}`} className="v4-anm-item">
      <span className="v4-anm-num num" aria-hidden="true">
        {n}
      </span>
      <div>
        <p className="v4-anm-title">
          {title}{" "}
          <a href={`#anm-ref-${n}`} className="v4-anm-back" aria-label={`Zurück zu Anmerkung ${n}`}>
            ↑
          </a>
        </p>
        {children}
      </div>
    </li>
  );
}

export function StartAnmerkungen({
  kopfDayKey,
  kopfFootnote,
  panel,
  surplusLine,
  lastLine,
  system,
}: {
  kopfDayKey: string;
  kopfFootnote: string | null;
  panel: HomeDayPanelData | null;
  surplusLine: string;
  lastLine: string | null;
  system: { totalSurplusGwh: number; x1AbsorbedGwh: number; x1SharePct: number } | null;
}) {
  const dayLabel = formatBerlinDayLabel(kopfDayKey);
  const wd = weekdayShort(kopfDayKey, "de");
  const modelNote =
    panel && panel.model.unavailableReasonDe && panel.model.unavailableReasonDe.length <= 70
      ? panel.model.unavailableReasonDe
      : "Für diesen Tag nicht verfügbar.";

  return (
    <footer className="v4-anm v4-content" aria-labelledby="anm-titel" data-testid="start-day-footnotes">
      <h2 id="anm-titel" className="v4-anm-h2 num">
        Anmerkungen
      </h2>
      <ol className="v4-anm-list">
        <Note n={START_NOTE.auffaelligkeit} title="30 Tage">
          {kopfFootnote ? <p>{kopfFootnote}</p> : null}
          <p>
            Ein Tag zählt als „ohne Überschuss“ unter 0,05 GWh.{" "}
            <Link href="/methodik#auffaelligkeit" className="v4-footnote-link">
              Wie die Auffälligkeit gewählt wird
            </Link>
          </p>
        </Note>
        {panel ? (
          <Note n={START_NOTE.daten} title="Daten">
            <p data-testid="start-day-meta">
              {wd}, {dayLabel} · Energy-Charts · {panel.fetchStand}
            </p>
            {lastLine ? <p>{lastLine}</p> : null}
          </Note>
        ) : null}
        {panel ? (
          <Note n={START_NOTE.ueberschuss} title="Überschuss und Modell am Tag">
            <p data-testid="start-day-surplus-headline">{surplusLine}</p>
            <p>Wind und Sonne über der Last, je Viertelstunde: Σ max(0, Wind+Sonne−Last)×¼h.</p>
            {panel.model.available ? (
              <p data-testid="start-day-model-fleet">
                Referenzflotte {formatQuantity(panel.model.powerGw, "de", 2)} GW /{" "}
                {formatQuantity(panel.model.energyGwh, "de", 2)} GWh. Geladen {formatPanelGwh(panel.model.chargedGwh)}{" "}
                GWh, abgegeben {formatPanelGwh(panel.model.dischargedGwh)} GWh. Hypothetisch.
              </p>
            ) : (
              <p data-testid="start-day-model-fleet">{modelNote}</p>
            )}
            <p>Annahmen und Zeiträume: {panel.model.disclosureDe}</p>
            <p>Lokale Netzwirkung: nicht bewertet.</p>
          </Note>
        ) : null}
        {system ? (
          <Note n={START_NOTE.system} title="30-Tage-Modell">
            <p>
              Überschuss-Lademodell. ×2, ×5 und ×10 skalieren Leistung und Energie der Referenzflotte gemeinsam. Nur
              Anteil des beobachteten Wind-Solar-Überschusses, keine Spitzen-, Preis- oder Netzwirkung, keine Abregelung.
            </p>
            <p>
              Überschuss {formatQuantity(system.totalSurplusGwh, "de", 1)} GWh in 30 Tagen. Bei ×1 hätte das Modell{" "}
              {formatQuantity(system.x1AbsorbedGwh, "de", 1)} GWh geladen ({formatQuantity(system.x1SharePct, "de", 0)}
              &nbsp;%). Wo der graue Balken höher ist als der farbige Teil, war mehr Überschuss da, als das Modell
              aufnehmen konnte. Euro nur bei ×1 auf anderen Seiten, hier nur Prozent und GWh.
            </p>
          </Note>
        ) : null}
      </ol>
      <p className="v4-anm-more">
        Quellen, Einheiten und Unsicherheiten:{" "}
        <Link href="/methodik" className="v4-footnote-link">
          Methodik
        </Link>
      </p>
    </footer>
  );
}
