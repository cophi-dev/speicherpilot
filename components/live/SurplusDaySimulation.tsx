"use client";

import { useMemo } from "react";
import { FactorSlider } from "@/components/day-ring/FactorSlider";
import { GlossaryTip } from "@/components/GlossaryTip";
import { useLanguage } from "@/components/language-context";
import { formatQuantity } from "@/lib/formatQuantity";
import type { LiveDispatchFactor } from "@/lib/liveFleetDispatch";
import type { SurplusDayReport } from "@/lib/surplusDaySimulation";

function gwh(value: number | null, language: "de" | "en", digits = 2) {
  if (value === null || !Number.isFinite(value)) {
    return language === "de" ? "nicht veröffentlicht" : "not published";
  }
  return `${formatQuantity(value, language, digits)} GWh`;
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="mix-surplus-metric">
      <p className="mix-surplus-metric-label">{label}</p>
      <p className="mix-surplus-metric-value num">{value}</p>
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

  const curtailmentText = useMemo(() => {
    if (!observed) {
      return null;
    }
    if (observed.curtailmentStatus === "loaded" && observed.curtailmentGwh !== null) {
      return gwh(observed.curtailmentGwh, language);
    }
    return language === "de"
      ? "Abregelungsdaten für diesen Tag noch nicht veröffentlicht"
      : "Curtailment data for this day are not published yet";
  }, [language, observed]);

  if (!report || !observed || !step) {
    return null;
  }

  const dateParts = observed.dateBerlin.split("-");
  const dateLabel =
    dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}` : observed.dateBerlin;
  const satNote =
    factor >= 5
      ? tx("Obergrenze ohne Preiswirkung", "Upper bound without price effect")
      : null;
  const exportSim =
    step.simulatedExportGwh !== null && step.observedExportGwh !== null
      ? tx(
          `Export beobachtet ${gwh(step.observedExportGwh, language)}, in der Modellschätzung ${gwh(step.simulatedExportGwh, language)} (Δ ${formatQuantity(step.exportDeltaGwh ?? 0, language, 2)} GWh).`,
          `Export observed ${gwh(step.observedExportGwh, language, 2)}, in the model estimate ${gwh(step.simulatedExportGwh, language, 2)} (Δ ${formatQuantity(step.exportDeltaGwh ?? 0, language, 2)} GWh).`
        )
      : tx(
          "Grenzhandel ist für diesen Tag in der Reihe nicht vollständig.",
          "Cross-border trading is not complete in the series for this day."
        );

  return (
    <section className="day-paper mix-board mix-surplus" aria-labelledby="surplus-day-heading">
      <div className="day-hero-inner mix-inner">
        <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
          {tx("Deutschland", "Germany")} · {dateLabel}
        </p>
        <div className="mix-head">
          <h2 id="surplus-day-heading">{tx("Überschuss, Export und Speicher", "Surplus, export and storage")}</h2>
        </div>
        <p className="mix-agg max-w-[68ch]">
          {tx(
            "Wo Wind und Sonne über der Last liegen, entsteht Überschuss. Ein Teil geht über die Grenze, ein Teil wird abgeregelt. Die Tabelle zeigt, wie viel die modellierte Flotte bei ×1 bis ×10 aufnehmen könnte und wie sich Export und Abregelung in der Modellschätzung verringern.",
            "Where wind and solar sit above load, surplus appears. Some leaves via the border, some is curtailed. The table shows how much the modeled fleet at ×1 to ×10 could absorb and how export and curtailment fall in the model estimate."
          )}{" "}
          <GlossaryTip id="modellschaetzung" language={language} />
        </p>

        <div className="mix-surplus-grid" role="group" aria-label={tx("Beobachteter Tag", "Observed day")}>
          <Metric
            label={tx("Überschuss Wind und Sonne", "Wind and solar surplus")}
            value={gwh(observed.renewableSurplusGwh, language)}
            detail={
              observed.structuralSurplusGwh > observed.renewableSurplusGwh + 0.001
                ? tx(
                    `Modell-Ladefenster (Erzeugung − Last): ${gwh(observed.structuralSurplusGwh, language)}`,
                    `Model charge window (generation − load): ${gwh(observed.structuralSurplusGwh, language)}`
                  )
                : tx("Summe max(0, Erneuerbare − Last) · ¼ h", "Sum of max(0, renewables − load) · ¼ h")
            }
          />
          <Metric
            label={tx("Export beobachtet", "Export observed")}
            value={gwh(observed.observedExportGwh, language)}
            detail={tx("Energy-Charts, Grenzhandel", "Energy-Charts, cross-border trading")}
          />
          <Metric
            label={tx("Abregelung", "Curtailment")}
            value={curtailmentText ?? "—"}
            detail={tx("Netztransparenz, verzögert", "Netztransparenz, delayed")}
          />
          <Metric
            label={tx(`Aufnahme ×${factor}`, `Absorption ×${factor}`)}
            value={gwh(step.absorbedGwh, language)}
            detail={tx("Modellschätzung, nutzbar 10–90 %", "Model estimate, usable 10–90%")}
          />
        </div>

        <div className="mix-soc">
          <h3>{tx("Szenario ×1 bis ×10", "Scenario ×1 to ×10")}</h3>
          <FactorSlider
            factor={factor}
            label={tx("Speicher im Netz", "Storage on the grid")}
            valueText={language === "de" ? `×${factor} Speicherflotte` : `×${factor} storage fleet`}
            saturationIndex={saturationIndex}
            onChange={onFactor}
          />
          {satNote ? <p className="mix-surplus-line">{satNote}</p> : null}
          <div className="mix-table-wrap">
            <table className="mix-table">
              <caption>
                {tx(
                  "Modellschätzung je Vielfaches. Obergrenze ohne Preiswirkung ab ×5.",
                  "Model estimate per multiple. Upper bound without price effect from ×5."
                )}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{tx("Faktor", "Factor")}</th>
                  <th scope="col">{tx("Aufnahme", "Absorption")}</th>
                  <th scope="col">{tx("Export sim.", "Export sim.")}</th>
                  <th scope="col">{tx("Abregelung verbleibend", "Curtailment left")}</th>
                </tr>
              </thead>
              <tbody>
                {([1, 2, 5, 10] as const).map((rowFactor) => {
                  const row = report.factors[rowFactor];
                  const curtailLeft =
                    observed.curtailmentStatus === "loaded" && row.remainingCurtailmentGwh !== null
                      ? gwh(row.remainingCurtailmentGwh, language)
                      : tx("noch nicht veröffentlicht", "not published yet");
                  return (
                    <tr key={rowFactor} aria-current={rowFactor === factor ? "true" : undefined}>
                      <th scope="row">×{rowFactor}</th>
                      <td className="num">{gwh(row.absorbedGwh, language)}</td>
                      <td className="num">
                        {row.simulatedExportGwh !== null
                          ? gwh(row.simulatedExportGwh, language)
                          : tx("—", "—")}
                      </td>
                      <td className="num">{curtailLeft}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mix-surplus-line">{exportSim}</p>
          <p className="mix-source">
            {tx(
              "Export-Gegenrechnung: beobachteter Grenzfluss plus netzkoppelte Ladung minus modellierte Abgabe. Keine Euro-Werte. Preisnehmer, nur Day-Ahead.",
              "Export counter-calculation: observed border flow plus grid-coupled charging minus modeled discharge. No euro figures. Price taker, day-ahead only."
            )}{" "}
            <a className="underline underline-offset-[3px]" href="/methodik#live">
              {tx("Formeln", "Formulas")}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
