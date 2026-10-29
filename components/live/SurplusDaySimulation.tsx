"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FactorSlider } from "@/components/day-ring/FactorSlider";
import { GlossaryTip } from "@/components/GlossaryTip";
import { useLanguage, type AppLanguage } from "@/components/language-context";
import {
  DispatchDayChart,
  niceChartScale,
  SimLegend,
  type ChartAnnotation,
  type ChartSample,
} from "@/components/sim/DispatchDayChart";
import {
  formatQuarterlyCurtailmentGwh,
  formatSignedDeltaGwh,
  SMARD_QUARTERLY_TOPIC_URL,
} from "@/lib/eeCurtailmentQuarterly";
import { formatQuantity } from "@/lib/formatQuantity";
import { LIVE_DISPATCH_FACTORS, type LiveDispatchFactor } from "@/lib/liveFleetDispatch";
import {
  SURPLUS_DAY_RTE,
  surplusEveningPeaksGw,
  surplusQuartersToChartSamples,
  type SurplusChartSample,
  type SurplusDayQuarter,
  type SurplusDayReport,
} from "@/lib/surplusDaySimulation";

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

function formatGw(value: number, language: AppLanguage) {
  const shown = Math.round(value * 10) / 10;
  return formatQuantity(shown, language, Number.isInteger(shown) ? 0 : 1);
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return reduced;
}

function lerpSamples(from: SurplusChartSample[], to: SurplusChartSample[], amount: number): SurplusChartSample[] {
  return to.map((point, index) => {
    const prev = from[index] ?? point;
    const mix = (start: number, end: number) => start + (end - start) * amount;
    return {
      ...point,
      ohne: point.ohne,
      mit: mix(prev.mit, point.mit),
      charge: mix(prev.charge, point.charge),
      discharge: mix(prev.discharge, point.discharge),
      soc: mix(prev.soc, point.soc),
    };
  });
}

function chartNotes(
  samples: ChartSample[],
  factor: LiveDispatchFactor,
  dischargedGwh: number,
  language: AppLanguage
): ChartAnnotation[] {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const notes: ChartAnnotation[] = [];
  let peak = -1;
  let peakValue = Number.NEGATIVE_INFINITY;
  samples.forEach((sample, index) => {
    if (sample.hour >= 17 && sample.ohne > peakValue) {
      peakValue = sample.ohne;
      peak = index;
    }
  });
  let mitPeak = -1;
  let mitValue = Number.NEGATIVE_INFINITY;
  samples.forEach((sample, index) => {
    if (sample.hour >= 17 && sample.mit > mitValue) {
      mitValue = sample.mit;
      mitPeak = index;
    }
  });
  if (peak >= 0) {
    const sample = samples[peak];
    notes.push({
      hour: sample.hour,
      slotIndex: peak,
      value: sample.ohne,
      text: `${formatGw(sample.ohne, language)} GW ${tx("ohne Speicher", "without storage")}`,
      anchor: "middle",
      dy: -14,
      dx: -8,
      mdx: -16,
      mdy: -12,
    });
  }
  if (mitPeak >= 0) {
    const sample = samples[mitPeak];
    notes.push({
      hour: sample.hour,
      slotIndex: mitPeak,
      value: sample.mit,
      text: `${formatGw(sample.mit, language)} GW ${tx("mit", "with")} ×${factor}`,
      anchor: "middle",
      dy: -14,
      dx: 8,
      mdx: 18,
      mdy: -12,
      strong: true,
    });
  }
  if (dischargedGwh > 0.001 && mitPeak >= 0) {
    const sample = samples[mitPeak];
    notes.push({
      hour: sample.hour,
      slotIndex: mitPeak,
      value: sample.mit,
      text: `${formatQuantity(dischargedGwh, language, 1)} GWh ${tx("abgegeben", "discharged")}`,
      anchor: "start",
      dy: 22,
      dx: 10,
      mdx: 12,
      mdy: 18,
    });
  }
  return notes;
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
  const reduced = usePrefersReducedMotion();

  const samplesByFactor = useMemo(() => {
    if (!report) {
      return null;
    }
    const built = {} as Record<LiveDispatchFactor, SurplusChartSample[]>;
    for (const rowFactor of LIVE_DISPATCH_FACTORS) {
      built[rowFactor] = surplusQuartersToChartSamples(report.factors[rowFactor].quarters);
    }
    return built;
  }, [report]);

  const target = useMemo(() => samplesByFactor?.[factor] ?? [], [samplesByFactor, factor]);
  const [shown, setShown] = useState<SurplusChartSample[]>(target);
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useEffect(() => {
    if (target.length === 0) {
      setShown([]);
      return;
    }
    const from = shownRef.current;
    if (reduced || from.length !== target.length) {
      setShown(target);
      return;
    }
    const started = performance.now();
    let frame = requestAnimationFrame(function tick(now: number) {
      const amount = Math.min(1, (now - started) / 150);
      setShown(lerpSamples(from, target, amount));
      if (amount < 1) {
        frame = requestAnimationFrame(tick);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [target, reduced]);

  const scale = useMemo(() => {
    if (!samplesByFactor) {
      return null;
    }
    const values: number[] = [0];
    for (const rows of Object.values(samplesByFactor)) {
      for (const row of rows) {
        values.push(row.ohne, row.mit, row.discharge, -row.charge);
      }
    }
    return niceChartScale(values);
  }, [samplesByFactor]);

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
  const peaks = surplusEveningPeaksGw(step.quarters);
  const chartSamples: ChartSample[] = shown;
  const evening = peaks.beforeGw !== null && peaks.afterGw !== null;

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

  const tableCaption = tx(
    `Viertelstunden am ${dateLabel}: Export beobachtet und simuliert, Ladung aus Überschuss, Abgabe und Ladezustand. Modellschätzung.`,
    `Quarter-hours on ${dateLabel}: export observed and simulated, charging from surplus, discharge and state of charge. Model estimate.`
  );

  return (
    <section className="day-paper mix-board mix-surplus" aria-labelledby="surplus-day-heading">
      <div className="day-hero-inner mix-inner">
        <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
          {tx("Deutschland", "Germany")} · {dateLabel} ({tx("letzter ganzer Tag", "last full day")})
        </p>
        <div className="mix-head">
          <h2 id="surplus-day-heading">{tx("Überschuss, Export und Speicher", "Surplus, export and storage")}</h2>
        </div>
        <p className="mix-agg max-w-[68ch]">
          {tx(
            "Wo Wind und Sonne über der Last liegen, entsteht Überschuss. Ein Teil geht über die Grenze. Die Grafik und Tabelle zeigen, wie viel die modellierte Flotte bei ×1 bis ×10 aufnehmen könnte und wie sich Residuallast und Export in der Modellschätzung verändern.",
            "Where wind and solar sit above load, surplus appears. Some leaves via the border. The chart and table show how much the modeled fleet at ×1 to ×10 could absorb and how residual load and export change in the model estimate."
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
                "Viertelstunden, in denen Wind und Sonne mehr liefern als gebraucht wird",
                "Quarter-hours when wind and solar deliver more than is used"
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
            {scale && chartSamples.length > 0 ? (
              <div className="mix-surplus-chart sim-chart">
                <p className="sim-kicker mix-surplus-chart-kicker">
                  {tx("Residuallast und Export", "Residual load and export")} · {dateLabel}
                  <span className="sim-chip sim-chip-gap">{tx("Modell, Obergrenze ohne Preiswirkung", "Model, upper bound without price effect")}</span>
                </p>
                <SimLegend
                  items={[
                    { swatch: "ohne", label: tx("ohne Speicher", "without storage") },
                    { swatch: "mit", label: tx("mit Speicher", "with storage") },
                    { swatch: "charge", label: tx("lädt aus Überschuss", "charges from surplus") },
                    { swatch: "discharge", label: tx("gibt ab", "discharges") },
                    { swatch: "hatch", label: tx("Abend entlastet", "Evening relief") },
                  ]}
                />
                <DispatchDayChart
                  samples={chartSamples}
                  unit="GW"
                  y0={scale.y0}
                  y1={scale.y1}
                  yTicks={scale.yTicks}
                  hatch="graphite"
                  tipLoad={tx("Residuallast", "Residual load")}
                  ariaLabel={
                    evening
                      ? tx(
                          `Residuallast und Export am ${dateLabel} mit ×${factor}. Abendspitze ${formatGw(peaks.beforeGw!, language)} auf ${formatGw(peaks.afterGw!, language)} GW. Modellschätzung.`,
                          `Residual load and export on ${dateLabel} at ×${factor}. Evening peak ${formatGw(peaks.beforeGw!, language)} to ${formatGw(peaks.afterGw!, language)} GW. Model estimate.`
                        )
                      : tx(`Residuallast und Export am ${dateLabel}. Modellschätzung.`, `Residual load and export on ${dateLabel}. Model estimate.`)
                  }
                  tag={tx("MODELL", "MODEL")}
                  annotations={chartNotes(chartSamples, factor, step.dischargedGwh, language)}
                  chargedNote={tx(
                    `Aufnahme ${gwh(step.absorbedGwh, language)} vor 17 Uhr. Abgabe ${gwh(step.dischargedGwh, language)}. Wirkungsgrad ${formatQuantity(SURPLUS_DAY_RTE * 100, language, 0)} % auf der Abgabe.`,
                    `Absorption ${gwh(step.absorbedGwh, language)} before 17:00. Discharge ${gwh(step.dischargedGwh, language)}. ${formatQuantity(SURPLUS_DAY_RTE * 100, language, 0)}% round-trip on discharge.`
                  )}
                  intro={false}
                  language={language}
                  fitLabels
                />
                <details className="mix-surplus-sr-table">
                  <summary>{tx("Tabellarische Daten für Screenreader", "Tabular data for screen readers")}</summary>
                  <QuarterTable quarters={step.quarters} caption={tableCaption} language={language} />
                </details>
              </div>
            ) : null}
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

function QuarterTable({
  quarters,
  caption,
  language,
}: {
  quarters: SurplusDayQuarter[];
  caption: string;
  language: AppLanguage;
}) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  return (
    <table className="mix-table mix-surplus-quarter-table">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{tx("Zeit", "Time")}</th>
          <th scope="col">{tx("Überschuss MW", "Surplus MW")}</th>
          <th scope="col">{tx("Laden MW", "Charge MW")}</th>
          <th scope="col">{tx("Export beob.", "Export obs.")}</th>
          <th scope="col">{tx("Export sim.", "Export sim.")}</th>
          <th scope="col">{tx("Ladezustand %", "SoC %")}</th>
        </tr>
      </thead>
      <tbody>
        {quarters.map((row) => (
          <tr key={row.timestampIso}>
            <td>{row.timestampIso.slice(11, 16)}</td>
            <td className="num tabular-nums">{formatQuantity(row.surplusMw, language, 0)}</td>
            <td className="num tabular-nums">{formatQuantity(row.chargeMw, language, 0)}</td>
            <td className="num tabular-nums">{formatQuantity(row.exportObservedMw, language, 0)}</td>
            <td className="num tabular-nums">{formatQuantity(row.exportSimulatedMw, language, 0)}</td>
            <td className="num tabular-nums">{formatQuantity(row.socFraction * 100, language, 0)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
