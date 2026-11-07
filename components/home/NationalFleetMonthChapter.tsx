"use client";

import Link from "next/link";

import { formatQuantity } from "@/lib/formatQuantity";
import type { MonatSurplusBar } from "@/lib/monatSurplusBars";
import {
  fleetMonatHref,
  fleetTagHref,
  NATIONAL_FLEET_FACTORS,
  NATIONAL_FLEET_STRATEGY_UI,
  type NationalFleetFactor,
  type NationalFleetMonthStats,
  type NationalFleetStrategyUi,
  getFleetRun,
  type NationalFleetMonthBundle,
} from "@/lib/nationalMonthFleetModel";

function formatGw(gw: number, digits = 2): string {
  return formatQuantity(gw, "de", digits);
}

export function NationalFleetMonthChapter({
  monthKey,
  bundle,
  factor,
  strategy,
  stats,
  bars,
}: {
  monthKey: string;
  bundle: NationalFleetMonthBundle;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  stats: NationalFleetMonthStats;
  bars: MonatSurplusBar[];
}) {
  const run = getFleetRun(bundle, factor, strategy);
  const dailySocMax = 0.9 * stats.fleetEnergyGwh * 1000;
  const dailySocMin = 0.1 * stats.fleetEnergyGwh * 1000;

  const socBands = bars.map((bar) => {
    if (!bar.clickable) {
      return { dateKey: bar.dateKey, min: null, max: null, chargeMwh: 0, dischargeMwh: 0 };
    }
    const idx: number[] = [];
    for (let i = 0; i < run.timestamp_berlin.length; i += 1) {
      if (run.timestamp_berlin[i].startsWith(bar.dateKey)) {
        idx.push(i);
      }
    }
    if (idx.length === 0) {
      return { dateKey: bar.dateKey, min: null, max: null, chargeMwh: 0, dischargeMwh: 0 };
    }
    let min = Infinity;
    let max = -Infinity;
    let charge = 0;
    let discharge = 0;
    for (const i of idx) {
      min = Math.min(min, run.e_start_mwh[i], run.e_end_mwh[i]);
      max = Math.max(max, run.e_start_mwh[i], run.e_end_mwh[i]);
      charge += run.c_mw[i] * 0.25;
      discharge += run.d_mw[i] * 0.25;
    }
    return { dateKey: bar.dateKey, min, max, chargeMwh: charge, dischargeMwh: discharge };
  });

  const maxSocBand = Math.max(...socBands.map((b) => b.max ?? 0), dailySocMax * 0.5);

  return (
    <section className="v4-chapter" aria-labelledby="fleet-month-title">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">Modellflotte · {monthKey}</p>
        <h2 id="fleet-month-title" className="v4-chapter-h2">
          So hätte die Referenzflotte im Monat fahren können
        </h2>
        <p className="v4-subline">
          Nationales Kurven-Overlay auf beobachteter Last und Erneuerbarer Erzeugung (Oktober 2026). Hypothetisch,
          nicht amtlicher Bestand — kein Anschlussnetz, keine Netzdienlichkeit, keine Abregelungsquote.
        </p>
      </div>

      <div className="v4-content v4-fleet-controls" role="group" aria-label="Szenario wählen">
        <fieldset className="v4-fleet-fieldset">
          <legend className="v4-fleet-legend">Faktor (×1 = 4,58 GW / 8 GWh nominal)</legend>
          <div className="v4-fleet-factor-row">
            {NATIONAL_FLEET_FACTORS.map((f) => (
              <Link
                key={f}
                href={fleetMonatHref(monthKey, f, strategy)}
                className={`v4-fleet-pill${f === factor ? " is-active" : ""}`}
                aria-current={f === factor ? "true" : undefined}
              >
                ×{f}
              </Link>
            ))}
          </div>
        </fieldset>
        <fieldset className="v4-fleet-fieldset">
          <legend className="v4-fleet-legend">Ziel / Fahrweise</legend>
          <div className="v4-fleet-strategy-row">
            {(Object.keys(NATIONAL_FLEET_STRATEGY_UI) as NationalFleetStrategyUi[]).map((id) => (
              <Link
                key={id}
                href={fleetMonatHref(monthKey, factor, id)}
                className={`v4-fleet-pill v4-fleet-pill-wide${id === strategy ? " is-active" : ""}`}
                aria-current={id === strategy ? "true" : undefined}
              >
                {NATIONAL_FLEET_STRATEGY_UI[id].shortDe}
              </Link>
            ))}
          </div>
        </fieldset>
      </div>

      <dl className="v4-fleet-kpis v4-content num">
        <div>
          <dt>Referenzflotte</dt>
          <dd>
            {formatGw(stats.fleetPowerGw, 2)} GW · {formatGw(stats.fleetEnergyGwh, 0)} GWh nam.
          </dd>
        </div>
        <div>
          <dt>Netzseitige Ladung</dt>
          <dd>{formatGw(stats.chargeGwh, 2)} GWh</dd>
        </div>
        <div>
          <dt>Netzseitige Abgabe</dt>
          <dd>{formatGw(stats.dischargeGwh, 2)} GWh</dd>
        </div>
        <div>
          <dt>Verlust (Ladung − Abgabe)</dt>
          <dd>{formatGw(stats.lossGwh, 2)} GWh</dd>
        </div>
        {stats.surplusCaptureGwh != null ? (
          <div>
            <dt>Aufnahme aus Wind-Solar-Differenz</dt>
            <dd>
              {formatGw(stats.surplusCaptureGwh, 2)} GWh
              {stats.surplusCaptureSharePct != null
                ? ` (${formatQuantity(stats.surplusCaptureSharePct, "de", 1)} % vom Okt.-Pool 134,2 GWh)`
                : null}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Monats-Restlastspitze R′</dt>
          <dd>
            {formatGw(stats.peakAfterGw, 2)} GW (−{formatGw(stats.peakReductionGw, 2)} GW,{" "}
            {formatQuantity(stats.peakReductionPct, "de", 1)} %)
          </dd>
        </div>
        <div>
          <dt>SoC Monatsanfang / -ende</dt>
          <dd>
            {formatGw(stats.socStartGwh, 1)} / {formatGw(stats.socEndGwh, 1)} GWh (50 % nominal, durchgehend)
          </dd>
        </div>
      </dl>

      <figure className="v4-monat-graph-wrap v4-content">
        <figcaption className="v4-fleet-caption">
          Täglicher SoC-Spielraum (Min–Max) und Energiemengen — Klick springt zum Tag mit gleicher Fahrweise.
        </figcaption>
        <div className="v4-monat-chart v4-fleet-soc-chart" role="img" aria-label="SoC-Verlauf je Tag">
          <div className="v4-monat-chart-scroll">
            <div
              className="v4-monat-chart-plot v4-fleet-soc-plot"
              style={{ gridTemplateColumns: `repeat(${socBands.length}, minmax(20px, 1fr))` }}
            >
              {socBands.map((band) => {
                const lowPct = band.min != null ? Math.max(0, (band.min / maxSocBand) * 100) : 0;
                const highPct = band.max != null ? Math.min(100, (band.max / maxSocBand) * 100) : 0;
                const height = Math.max(2, highPct - lowPct);
                const inner = (
                  <span
                    className="v4-monat-chart-bar v4-fleet-soc-bar"
                    style={{ height: `${height}%`, marginTop: `${100 - highPct}%` }}
                    title={
                      band.min != null
                        ? `SoC ${formatQuantity(band.min / 1000, "de", 2)}–${formatQuantity(band.max! / 1000, "de", 2)} GWh`
                        : "—"
                    }
                  />
                );
                const clickable = bars.find((b) => b.dateKey === band.dateKey)?.clickable;
                return (
                  <div key={band.dateKey} className="v4-monat-chart-slot">
                    {clickable ? (
                      <Link
                        href={fleetTagHref(band.dateKey, factor, strategy)}
                        className="v4-monat-chart-link"
                        aria-label={band.dateKey}
                      >
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </figure>

      <p className="v4-chapter-foot v4-content">
        {strategy === "spitze"
          ? "Vollvoraussicht über den ganzen Monat: optimistische technische Obergrenze, kein realer Netzbetrieb."
          : strategy === "markt"
            ? "Historische Day-Ahead-Preise ohne Marktrückwirkung; kein Euro-Vergleich für ×2/×5/×10."
            : "Laden nur bei Wind+Solar über Last, Entladen nur bei positiver Restlast — Modellaufnahme der Differenz, nicht vermiedene Abregelung."}
        {" "}
        <Link href="/methodik#grossspeicher" className="v4-text-link">
          Methodik Großspeicher →
        </Link>
      </p>
    </section>
  );
}
