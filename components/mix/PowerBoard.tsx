"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { FactorSlider } from "@/components/day-ring/FactorSlider";
import { GlossaryTip } from "@/components/GlossaryTip";
import { useLanguage } from "@/components/language-context";
import { markNavigationPending } from "@/components/NavigationProgress";
import { chartFrame, chartX, MixChart, spacedTicks, tickPlacement, useChartWidth } from "@/components/mix/MixChart";
import { SurplusYear } from "@/components/mix/SurplusYear";
import { formatQuantity } from "@/lib/formatQuantity";
import type { LiveDispatchFactor } from "@/lib/liveFleetDispatch";
import { parseLiveFactor } from "@/lib/liveFleetDispatch";
import { BOARD_ROUND_TRIP, type PowerBoardModel, type SocSample } from "@/lib/powerBoard";
import { SURPLUS_MONTHS } from "@/lib/surplusMonths";

export function PowerBoard({ model, missingFactor = 1 }: { model: PowerBoardModel; missingFactor?: LiveDispatchFactor }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawFactor = searchParams.get("x");
  const factor = rawFactor ? parseLiveFactor(rawFactor) : missingFactor;
  const samples = model.soc[factor] ?? [];
  const compact = useNarrow();
  const { hostRef: chartHost, width: chartWidth } = useChartWidth<HTMLDivElement>();
  const [pending, startTransition] = useTransition();
  const focusRange = useRef<string | null>(null);
  const heading = tx("Erzeugung und Last", "Generation and load");
  const readout = model.surplusReadout;
  const onFactor = (next: LiveDispatchFactor) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("x", String(next));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  const onRange = (href: string, id: string) => {
    const y = window.scrollY;
    focusRange.current = id;
    markNavigationPending();
    const keep = () => {
      if (Math.abs(window.scrollY - y) > 1) {
        window.scrollTo(0, y);
      }
    };
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
    keep();
    const timer = window.setInterval(keep, 50);
    window.setTimeout(() => window.clearInterval(timer), 1200);
  };

  useEffect(() => {
    const id = focusRange.current;
    if (!id) {
      return;
    }
    document.querySelector<HTMLButtonElement>(`[data-range="${id}"]`)?.focus();
    focusRange.current = null;
  }, [model.range]);

  return (
    <section className="day-paper mix-board" aria-labelledby="mix-heading">
      <div className="day-hero-inner mix-inner" ref={chartHost}>
        {model.quiet ? (
          <div className="mix-finding">
            <p>{model.quiet[language][0]}</p>
            <p>{model.quiet[language][1]}</p>
          </div>
        ) : null}
        {model.lastSurplus ? (
          <p className="mix-last">
            <Link href={model.lastSurplus.href}>
              {tx("Zuletzt war es so", "Last time it was like this")} · {model.lastSurplus.label}
            </Link>
          </p>
        ) : null}
        <div className="mix-head">
          <h2 id="mix-heading">{heading}</h2>
          <GlossaryTip id="residuallast" language={language} />
        </div>
        <p className="mix-agg">
          {model.aggregation[language]}
          {model.until ? tx(` Bisher bis ${model.until}.`, ` So far until ${model.until}.`) : null}
        </p>
        <nav className="mix-range" aria-label={tx("Zeitraum", "Period")} aria-busy={pending || undefined}>
          {model.links.map((link) => (
            <button
              key={link.id}
              type="button"
              data-range={link.id}
              aria-current={link.current ? "true" : undefined}
              onClick={() => onRange(link.href, link.id)}
            >
              {link.label[language]}
            </button>
          ))}
        </nav>
        <SurplusLine readout={readout} language={language} />
        {model.stale ? <p className="live-stale">{tx("Zuletzt gültige Reihe. Der Abruf ist gerade nicht gelungen.", "Last valid series. The request did not succeed just now.")}</p> : null}
        <MixChart
          points={model.points}
          unit={model.unit}
          title={heading}
          description={model.description[language]}
          language={language}
          compact={compact}
          surplusLabel={
            readout.hasSurplus
              ? tx(`Überschuss ${readout.surplus[language]}`, `Surplus ${readout.surplus[language]}`)
              : null
          }
        />
        <h3 className="mix-period">{model.periodTitle[language]}{model.until ? ` · ${tx("bis", "until")} ${model.until}` : ""}</h3>
        <dl className="mix-stats">
          {model.rows
            .filter((row) => ["load", "completeLoad", "windSolar", "share", "residualMax", "residualMin"].includes(row.id))
            .map((row) => (
              <div key={row.id}>
                <dt>{row.label[language]}</dt>
                <dd>{row.value[language]}</dd>
              </div>
            ))}
        </dl>
        <div className="mix-table-wrap">
          <table className="mix-table">
            <caption>{tx("Mix und Kennzahlen. Jede Zahl aus dem Befund steht in dieser Tabelle.", "Mix and figures. Every number in the finding is in this table.")}</caption>
            <thead>
              <tr>
                <th scope="col">{tx("Träger", "Carrier")}</th>
                <th scope="col">{tx("Wert", "Value")}</th>
              </tr>
            </thead>
            <tbody>
              {model.rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row">
                    {DOT[row.id] ? <span className={`mix-dot mix-fill-${DOT[row.id]}`} aria-hidden="true" /> : null}
                    {row.label[language]}
                  </th>
                  <td>{row.value[language]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SocLine model={model} samples={samples} points={model.points} factor={factor} compact={compact} chartWidth={chartWidth} onFactor={onFactor} />
        {SURPLUS_MONTHS ? <SurplusYear data={SURPLUS_MONTHS} /> : null}
        <p className="mix-source">
          {tx(
            "Energie: Energy-Charts (Fraunhofer ISE), CC BY 4.0. Preise: Bundesnetzagentur | SMARD.de, CC BY 4.0. Marktpreise, keine Erlöse.",
            "Energy: Energy-Charts (Fraunhofer ISE), CC BY 4.0. Prices: Bundesnetzagentur | SMARD.de, CC BY 4.0. Market prices, not revenue."
          )}
        </p>
      </div>
    </section>
  );
}

const DOT: Record<string, string> = {
  lignite: "lignite",
  hardCoal: "hardCoal",
  gas: "gas",
  biomass: "biomass",
  hydro: "hydro",
  windOffshore: "windOffshore",
  windOnshore: "windOnshore",
  solar: "solar",
  other: "other",
  load: "load",
  trade: "trade",
};

function useNarrow(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(max-width: 420px)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(max-width: 420px)").matches,
    () => false
  );
}

function SurplusLine({
  readout,
  language,
}: {
  readout: PowerBoardModel["surplusReadout"];
  language: "de" | "en";
}) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  if (!readout.known) {
    return <p className="mix-surplus-line">{tx("Überschuss nicht veröffentlicht.", "Surplus is not published.")}</p>;
  }
  if (!readout.hasSurplus) {
    return <p className="mix-surplus-line">{tx("Kein Überschuss.", "No surplus.")}</p>;
  }
  const charged = readout.charged
    ? tx(
        `Speicher ×1 hätte ${readout.charged[language]} geladen`,
        `Storage ×1 would have charged ${readout.charged[language]}`
      )
    : tx("Speicher ×1 ist gerade nicht geladen", "Storage ×1 is not loaded");
  return (
    <p className="mix-surplus-line">
      {tx(
        `Überschuss ${readout.surplus[language]}, Export in diesen Viertelstunden ${readout.exportDuring[language]}, ${charged}. Die geladene Menge ist eine Modellschätzung.`,
        `Surplus ${readout.surplus[language]}, export in these quarter-hours ${readout.exportDuring[language]}, ${charged}. The charged amount is a model estimate.`
      )}
    </p>
  );
}

function SocLine({
  model,
  samples,
  points,
  factor,
  compact,
  chartWidth,
  onFactor,
}: {
  model: PowerBoardModel;
  samples: SocSample[];
  points: PowerBoardModel["points"];
  factor: LiveDispatchFactor;
  compact: boolean;
  chartWidth: number;
  onFactor: (factor: LiveDispatchFactor) => void;
}) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const end = samples[samples.length - 1];
  const caption = model.fleet
    ? tx(
        `Angenommen ${model.fleet.power[language]} und ${model.fleet.energy[language]} mal ${factor}. Beginn des Zeitraums bei ${formatQuantity(model.startSocPct, language, 0)} %. Nutzbar 10 bis 90 %. Wirkungsgrad ${formatQuantity(BOARD_ROUND_TRIP * 100, language, 0)} % auf der Abgabe. Modellschätzung.`,
        `Assumed ${model.fleet.power[language]} and ${model.fleet.energy[language]} times ${factor}. Start of the period at ${formatQuantity(model.startSocPct, language, 0)}%. Usable 10 to 90%. ${formatQuantity(BOARD_ROUND_TRIP * 100, language, 0)}% round-trip on discharge. Model estimate.`
      )
    : tx("Die Flotte ist gerade nicht geladen.", "The fleet is not loaded just now.");
  const path = useMemo(() => socPath(samples, points, compact, chartWidth), [samples, points, compact, chartWidth]);
  const frame = chartFrame(compact, chartWidth);
  return (
    <div className="mix-soc">
      <h3>{tx("Ladezustand der angenommenen Flotte", "State of charge of the assumed fleet")}</h3>
      <p>{caption}</p>
      {model.fleet ? (
        <FactorSlider
          factor={factor}
          valueText={tx(`Faktor ${factor}`, `Factor ${factor}`)}
          label={tx("Speicherfaktor", "Storage factor")}
          saturationIndex={null}
          onChange={onFactor}
        />
      ) : null}
      {samples.length > 0 && points.length > 0 ? (
        <svg className={compact ? "mix-soc-chart is-compact" : "mix-soc-chart"} viewBox={`0 0 ${frame.width} 168`} role="img" aria-label={caption}>
          {points.map((point) =>
            point.tick ? (
              <line key={point.unix} className="mix-guide" x1={chartX(point.unix, points[0].unix, points[points.length - 1].unix, frame)} x2={chartX(point.unix, points[0].unix, points[points.length - 1].unix, frame)} y1="12" y2="120" />
            ) : null
          )}
          <line className="mix-guide" x1={frame.pad.l} x2={frame.width - frame.pad.r} y1={socY(90)} y2={socY(90)} />
          <line className="mix-guide" x1={frame.pad.l} x2={frame.width - frame.pad.r} y1={socY(10)} y2={socY(10)} />
          <text className="mix-axis" fontSize={frame.font} x={frame.pad.l - 6} y={socY(90)} textAnchor="end" dominantBaseline="middle">
            90 %
          </text>
          <text className="mix-axis" fontSize={frame.font} x={frame.pad.l - 6} y={socY(10)} textAnchor="end" dominantBaseline="middle">
            10 %
          </text>
          <path className="mix-soc-line" d={path} fill="none" />
          {spacedTicks(
            points.flatMap((point) => {
              if (!point.tick) {
                return [];
              }
              const placed = tickPlacement(chartX(point.unix, points[0].unix, points[points.length - 1].unix, frame), frame);
              return [{ unix: point.unix, text: point.tick, x: placed.x, anchor: placed.anchor }];
            }),
            56,
            frame.font
          ).map((tick) => (
            <text key={`${tick.unix}-tick`} className="mix-axis" fontSize={frame.font} x={tick.x} y="148" textAnchor={tick.anchor}>
              {tick.text}
            </text>
          ))}
          {end ? (
            <text className="mix-direct" fontSize={frame.font} x={frame.width - frame.pad.r + 8} y={socY(end.socPct)} dominantBaseline="middle">
              {`${formatQuantity(end.socPct, language, 0)} % · ${formatQuantity(end.socGwh, language, 1)} GWh`}
            </text>
          ) : null}
        </svg>
      ) : (
        <p>{tx("nicht veröffentlicht", "not published")}</p>
      )}
    </div>
  );
}

function socY(pct: number): number {
  const top = 12;
  const bottom = 120;
  return top + ((100 - pct) / 100) * (bottom - top);
}

function socPath(samples: SocSample[], points: PowerBoardModel["points"], compact: boolean, chartWidth: number): string {
  if (samples.length === 0 || points.length === 0) {
    return "";
  }
  const frame = chartFrame(compact, chartWidth);
  const min = points[0].unix;
  const max = points[points.length - 1].unix;
  return samples
    .map((sample, index) => {
      const x = chartX(sample.unix, min, max, frame);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${socY(sample.socPct).toFixed(1)}`;
    })
    .join(" ");
}
