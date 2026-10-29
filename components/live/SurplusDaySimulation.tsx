"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { FactorSlider } from "@/components/day-ring/FactorSlider";
import { GlossaryTip } from "@/components/GlossaryTip";
import { useLanguage } from "@/components/language-context";
import {
  formatQuarterlyCurtailmentGwh,
  formatSignedDeltaGwh,
  SMARD_QUARTERLY_TOPIC_URL,
} from "@/lib/eeCurtailmentQuarterly";
import { formatQuantity } from "@/lib/formatQuantity";
import { LIVE_DISPATCH_FACTORS, type LiveDispatchFactor } from "@/lib/liveFleetDispatch";
import type { SurplusDayReport } from "@/lib/surplusDaySimulation";

function gwh(value: number | null, language: "de" | "en", digits = 2) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }
  return `${formatQuantity(value, language, digits)}\u00a0GWh`;
}

function formatBerlinLabel(dateBerlin: string) {
  const dateParts = dateBerlin.split("-");
  return dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}` : dateBerlin;
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: ReactNode;
}) {
  return (
    <div className="mix-surplus-metric">
      <p className="mix-surplus-metric-label">{label}</p>
      <p className="mix-surplus-metric-value num tabular-nums">{value}</p>
      {detail ? <p className="mix-surplus-metric-detail">{detail}</p> : null}
    </div>
  );
}

export function SurplusDaySimulation({
  report,
  factor,
  onFactor,
  saturationIndex,
}: {
  report: SurplusDayReport | null;
  factor: LiveDispatchFactor;
  onFactor: (next: LiveDispatchFactor) => void;
  saturationIndex: number | null;
}) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const step = report?.factors[factor] ?? null;
  const observed = report?.observed ?? null;

  const lastSurplusLink =
    observed?.lastSurplusDateBerlin ? (
      <Link className="underline underline-offset-[3px]" href={`/live?tag=${observed.lastSurplusDateBerlin}`}>
        {formatBerlinLabel(observed.lastSurplusDateBerlin)}
      </Link>
    ) : null;

  if (!report || !observed || !step) {
    return null;
  }

  const dateLabel = formatBerlinLabel(observed.dateBerlin);
  const noSurplus = observed.windSolarSurplusGwh <= 0.000_5;
  const quarterlyGwh = formatQuarterlyCurtailmentGwh(language);

  const curtailmentDetail =
    language === "de" ? (
      <>
        Tageswerte veröffentlicht niemand. Zuletzt bekannt: {quarterlyGwh} in Deutschland (
        <a className="underline underline-offset-[3px]" href={SMARD_QUARTERLY_TOPIC_URL}>
          Bundesnetzagentur/SMARD
        </a>
        , Q2 2026, veröffentlicht 12.10.2026)
      </>
    ) : (
      <>
        No daily figures are published. Last known: {quarterlyGwh} in Germany (
        <a className="underline underline-offset-[3px]" href={SMARD_QUARTERLY_TOPIC_URL}>
          Bundesnetzagentur/SMARD
        </a>
        , Q2 2026, published 12 Oct 2026)
      </>
    );

  const exportSim =
    step.simulatedExportGwh !== null && step.observedExportGwh !== null
      ? tx(
          `Export beobachtet ${gwh(step.observedExportGwh, language)}, in der Modellschätzung ${gwh(step.simulatedExportGwh, language)} (Δ ${formatSignedDeltaGwh(step.exportDeltaGwh ?? 0, language, 2)}\u00a0GWh).`,
          `Export observed ${gwh(step.observedExportGwh, language)}, in the model estimate ${gwh(step.simulatedExportGwh, language)} (Δ ${formatSignedDeltaGwh(step.exportDeltaGwh ?? 0, language, 2)}\u00a0GWh).`
        )
      : tx(
          "Grenzhandel ist für diesen Tag in der Reihe nicht vollständig.",
          "Cross-border trading is not complete in the series for this day."
        );

  return (
    <section className="day-paper mix-board mix-surplus" aria-labelledby="surplus-day-heading">
      <div className="day-hero-inner mix-inner">
        <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
          {tx("Deutschland", "Germany")} · {dateLabel} ({tx("ganzer Tag", "full day")})
        </p>
        <div className="mix-head">
          <h2 id="surplus-day-heading">{tx("Überschuss, Export und Speicher", "Surplus, export and storage")}</h2>
        </div>
        <p className="mix-agg max-w-[68ch]">
          {tx(
            "Wo Wind und Sonne über der Last liegen, entsteht Überschuss. Ein Teil geht über die Grenze. Die Tabelle zeigt, wie viel die modellierte Flotte bei ×1 bis ×10 aufnehmen könnte und wie sich der Export in der Modellschätzung verringert.",
            "Where wind and solar sit above load, surplus appears. Some leaves via the border. The table shows how much the modeled fleet at ×1 to ×10 could absorb and how export falls in the model estimate."
          )}{" "}
          <GlossaryTip id="modellschaetzung" language={language} />
        </p>

        {noSurplus ? (
          <p className="mix-surplus-empty">
            {tx("An diesem Tag gab es keinen Überschuss aus Wind und Sonne.", "On this day there was no wind-and-solar surplus.")}{" "}
            {lastSurplusLink ? (
              <>
                {tx("Zuletzt am ", "Last on ")}
                {lastSurplusLink}
                {tx(".", ".")}
              </>
            ) : null}
          </p>
        ) : (
          <div className="mix-surplus-grid" role="group" aria-label={tx("Beobachteter Tag", "Observed day")}>
            <Metric
              label={tx("Überschuss Wind und Sonne", "Wind and solar surplus")}
              value={gwh(observed.windSolarSurplusGwh, language)}
              detail={tx(
                "Summe max(0, Wind an Land + Wind auf See + Sonne − Last) · ¼ h",
                "Sum of max(0, onshore wind + offshore wind + solar − load) · ¼ h"
              )}
            />
            <Metric
              label={tx("Export beobachtet", "Export observed")}
              value={gwh(observed.observedExportGwh, language)}
              detail={tx("Energy-Charts, Grenzhandel", "Energy-Charts, cross-border trading")}
            />
            <Metric label={tx("Abregelung", "Curtailment")} value="—" detail={curtailmentDetail} />
            <Metric
              label={tx(`Aufnahme ×${factor}`, `Absorption ×${factor}`)}
              value={gwh(step.absorbedGwh, language)}
              detail={tx("Modellschätzung, nutzbar 10–90 %", "Model estimate, usable 10–90%")}
            />
          </div>
        )}

        {!noSurplus ? (
          <div className="mix-soc">
            <p className="mix-surplus-slider-kicker num">{tx("SPEICHER IM NETZ ×1 BIS ×10", "STORAGE ON THE GRID ×1 TO ×10")}</p>
            <div className="mix-surplus-slider">
              <FactorSlider
                factor={factor}
                label=""
                valueText={language === "de" ? `×${factor} Speicherflotte` : `×${factor} storage fleet`}
                saturationIndex={saturationIndex}
                onChange={onFactor}
              />
            </div>
            <div className="mix-table-wrap mix-surplus-table-wrap">
              <table className="mix-table mix-surplus-table">
                <caption className="sr-only">
                  {tx("Modellschätzung je Vielfaches der Flotte", "Model estimate per fleet multiple")}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{tx("Faktor", "Factor")}</th>
                    <th scope="col" className="mix-num-col">
                      {tx("Aufnahme", "Absorption")}
                    </th>
                    <th scope="col" className="mix-num-col">
                      {tx("Export sim.", "Export sim.")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {LIVE_DISPATCH_FACTORS.map((rowFactor) => {
                    const row = report.factors[rowFactor];
                    const showChip = rowFactor === 5 || rowFactor === 10;
                    return (
                      <tr
                        key={rowFactor}
                        className={rowFactor === factor ? "mix-surplus-row-selected" : undefined}
                        aria-current={rowFactor === factor ? "true" : undefined}
                      >
                        <th scope="row">
                          ×{rowFactor}
                          {showChip ? (
                            <span className="mix-surplus-chip">
                              {tx("Obergrenze ohne Preiswirkung", "Upper bound without price effect")}
                            </span>
                          ) : null}
                        </th>
                        <td className="num tabular-nums mix-num-col">{gwh(row.absorbedGwh, language)}</td>
                        <td className="num tabular-nums mix-num-col">
                          {row.simulatedExportGwh !== null ? gwh(row.simulatedExportGwh, language) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mix-surplus-cards" aria-hidden="false">
                {LIVE_DISPATCH_FACTORS.map((rowFactor) => {
                  const row = report.factors[rowFactor];
                  const showChip = rowFactor === 5 || rowFactor === 10;
                  return (
                    <div
                      key={rowFactor}
                      className={`mix-surplus-card${rowFactor === factor ? " is-selected" : ""}`}
                      aria-current={rowFactor === factor ? "true" : undefined}
                    >
                      <p className="mix-surplus-card-factor num">
                        ×{rowFactor}
                        {showChip ? (
                          <span className="mix-surplus-chip mix-surplus-chip-card">
                            {tx("Obergrenze ohne Preiswirkung", "Upper bound without price effect")}
                          </span>
                        ) : null}
                      </p>
                      <p className="mix-surplus-card-line num tabular-nums">
                        {tx("Aufnahme", "Absorption")} · {gwh(row.absorbedGwh, language)}
                      </p>
                      <p className="mix-surplus-card-line num tabular-nums">
                        {tx("Export sim.", "Export sim.")} ·{" "}
                        {row.simulatedExportGwh !== null ? gwh(row.simulatedExportGwh, language) : "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="mix-surplus-line">{exportSim}</p>
            <p className="mix-source">
              {tx(
                "Export-Gegenrechnung je Viertelstunde: max(0, beobachteter Export minus Ladung aus Überschuss). Entladung ab 17 Uhr ändert den Export nicht. Keine Euro-Werte.",
                "Export counter-calculation each quarter-hour: max(0, observed export minus charging from surplus). Discharge from 17:00 does not change export. No euro figures."
              )}{" "}
              <a className="underline underline-offset-[3px]" href="/methodik#live">
                {tx("Formeln", "Formulas")}
              </a>
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
