"use client";

import { useMemo, useState } from "react";

import { formatQuantity } from "@/lib/formatQuantity";
import type { OverviewEvaluation } from "@/lib/overviewChain";
import { weekdayLabelDe } from "@/lib/auffaelligkeit";

const FACTORS = [1, 2, 5, 10] as const;

export function SystemChapter({
  model,
  fleetPowerGw,
  fleetEnergyGwh,
}: {
  model: OverviewEvaluation;
  fleetPowerGw: number;
  fleetEnergyGwh: number;
}) {
  const [factor, setFactor] = useState<(typeof FACTORS)[number]>(1);
  const f = model.factors[factor];
  const sharePct = Math.round((f.absorbedShare ?? 0) * 100);
  const x5Pct = Math.round((model.factors[5].absorbedShare ?? 0) * 100);
  const x10Pct = Math.round((model.factors[10].absorbedShare ?? 0) * 100);

  const surplusDays = useMemo(
    () => f.dayRows.filter((row) => row.surplusGwh >= 0.05).sort((a, b) => a.dateBerlin.localeCompare(b.dateBerlin)),
    [f.dayRows]
  );
  const totalSurplus = model.observed.surplusGwh ?? 0;
  const loaded = f.absorbedGwh;

  return (
    <section className="v4-chapter" aria-labelledby="kapitel-system">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">02 · Das System</p>
        <h2 id="kapitel-system" className="v4-chapter-h2">
          Was Speicher in den letzten 30 Tagen geschafft hätten
        </h2>
        <div className="v4-system-kern">
          <p className="v4-system-pct num" aria-live="polite">
            {formatQuantity(sharePct, "de", 0)}&nbsp;%
          </p>
          <div className="v4-system-side">
            <p>
              des Überschusses hätte die heutige Flotte ({formatQuantity(fleetPowerGw, "de", 2)} GW,{" "}
              {formatQuantity(fleetEnergyGwh, "de", 2)} GWh) aufgenommen.{" "}
              <span className="v4-chip num">Modellschätzung</span>
            </p>
            <p className="v4-system-multi num">
              ×5: {formatQuantity(x5Pct, "de", 0)}&nbsp;% · ×10: {formatQuantity(x10Pct, "de", 0)}&nbsp;%
            </p>
          </div>
        </div>
        <div className="v4-factor-bar" role="group" aria-label="Speicher-Multiplikator">
          {FACTORS.map((n) => (
            <button
              key={n}
              type="button"
              className={`v4-factor-btn num ${factor === n ? "is-active" : ""}`}
              aria-pressed={factor === n}
              onClick={() => setFactor(n)}
            >
              ×{n}
            </button>
          ))}
        </div>
      </div>
      <div className="v4-content v4-system-strip-wrap">
        <p className="v4-strip-caption num">Überschusstage (30 Tage)</p>
        <div className="v4-system-strip" role="img" aria-label="Tage mit Überschuss, Anteil geladen">
          {surplusDays.map((row) => {
            const w = totalSurplus > 0 ? (row.surplusGwh / totalSurplus) * 100 : 0;
            const fill = Math.min(100, (row.absorbedGwh / Math.max(row.surplusGwh, 1e-9)) * 100);
            return (
              <div
                key={row.dateBerlin}
                className="v4-system-seg"
                style={{ flexGrow: w, flexBasis: 0 }}
                title={`${row.dateBerlin}: ${formatQuantity(row.surplusGwh, "de", 1)} GWh`}
              >
                <span className="v4-system-seg-fill" style={{ width: `${fill}%` }} />
              </div>
            );
          })}
        </div>
        <div className="v4-system-labels num">
          {surplusDays
            .filter((row) => row.surplusGwh > 9)
            .map((row) => (
              <span key={row.dateBerlin}>{weekdayLabelDe(row.dateBerlin)}</span>
            ))}
        </div>
      </div>
      <div className="v4-content v4-system-acc-wrap">
        <p className="v4-strip-caption num">
          Zusammengeschoben: {formatQuantity(loaded, "de", 1)} von {formatQuantity(totalSurplus, "de", 1)} GWh geladen
          (Modell)
        </p>
        <div className="v4-system-acc" role="img" aria-label={`Aufnahme ${sharePct} Prozent bei Faktor ${factor}`}>
          <span className="v4-system-acc-fill" style={{ width: `${sharePct}%` }} />
          <span className="v4-system-acc-mark" style={{ left: `${x5Pct}%` }} aria-hidden />
          <span className="v4-system-acc-mark" style={{ left: `${x10Pct}%` }} aria-hidden />
        </div>
        <p className="v4-system-acc-labels num">
          <span>×{factor} {formatQuantity(sharePct, "de", 0)}&nbsp;%</span>
          <span>×5 {formatQuantity(x5Pct, "de", 0)}&nbsp;%</span>
          <span>×10 {formatQuantity(x10Pct, "de", 0)}&nbsp;%</span>
        </p>
      </div>
      <details className="v4-content v4-fold">
        <summary className="num">Immer öfter?</summary>
        <p className="v4-fold-body">
          An manchen Tagen war mehr Überschuss da als die Flotte aufnehmen konnte. Dann wäre sie früher voll gewesen —
          markiert als Speicher voll im Tagesstreifen.
        </p>
      </details>
      <details className="v4-content v4-fold">
        <summary className="num">Details</summary>
        <p className="v4-fold-body">
          Überschuss {formatQuantity(totalSurplus, "de", 1)} GWh in 30 Tagen. Bei ×1 hätte das Modell{" "}
          {formatQuantity(model.factors[1].absorbedGwh, "de", 1)} GWh geladen (
          {formatQuantity(Math.round((model.factors[1].absorbedShare ?? 0) * 100), "de", 0)}
          &nbsp;%).
        </p>
      </details>
    </section>
  );
}
