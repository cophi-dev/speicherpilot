"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { FactorSlider } from "@/components/day-ring/FactorSlider";
import { GlossaryTip } from "@/components/GlossaryTip";
import { useLanguage } from "@/components/language-context";
import { MixChart } from "@/components/mix/MixChart";
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
  const heading = tx("Erzeugung und Last", "Generation and load");
  const onFactor = (next: LiveDispatchFactor) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("x", String(next));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <section className="day-paper mix-board" aria-labelledby="mix-heading">
      <div className="day-hero-inner mix-inner">
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
        <nav className="mix-range" aria-label={tx("Zeitraum", "Period")}>
          {model.links.map((link) => (
            <Link key={link.id} href={link.href} aria-current={link.current ? "true" : undefined}>
              {link.label[language]}
            </Link>
          ))}
        </nav>
        {model.stale ? <p className="live-stale">{tx("Zuletzt gültige Reihe. Der Abruf ist gerade nicht gelungen.", "Last valid series. The request did not succeed just now.")}</p> : null}
        <MixChart
          points={model.points}
          unit={model.unit}
          title={heading}
          description={model.description[language]}
          language={language}
        />
        <h3 className="mix-period">{model.periodTitle[language]}{model.until ? ` · ${tx("bis", "until")} ${model.until}` : ""}</h3>
        <dl className="mix-stats">
          {model.rows
            .filter((row) => ["load", "windSolar", "share", "residualMax", "residualMin"].includes(row.id))
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
                  <th scope="row">{row.label[language]}</th>
                  <td>{row.value[language]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SocLine model={model} samples={samples} factor={factor} onFactor={onFactor} />
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

function SocLine({
  model,
  samples,
  factor,
  onFactor,
}: {
  model: PowerBoardModel;
  samples: SocSample[];
  factor: LiveDispatchFactor;
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
  const path = useMemo(() => socPath(samples), [samples]);
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
      {samples.length > 0 ? (
        <svg className="mix-soc-chart" viewBox="0 0 720 160" role="img" aria-label={caption}>
          <line className="mix-guide" x1="48" x2="640" y1={socY(90)} y2={socY(90)} />
          <line className="mix-guide" x1="48" x2="640" y1={socY(10)} y2={socY(10)} />
          <text className="mix-axis" x="42" y={socY(90)} textAnchor="end" dominantBaseline="middle">
            90 %
          </text>
          <text className="mix-axis" x="42" y={socY(10)} textAnchor="end" dominantBaseline="middle">
            10 %
          </text>
          <path className="mix-soc-line" d={path} fill="none" />
          {end ? (
            <text className="mix-direct" x="648" y={socY(end.socPct)} dominantBaseline="middle">
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
  const top = 16;
  const bottom = 140;
  return top + ((100 - pct) / 100) * (bottom - top);
}

function socPath(samples: SocSample[]): string {
  if (samples.length === 0) {
    return "";
  }
  const min = samples[0].unix;
  const max = samples[samples.length - 1].unix;
  return samples
    .map((sample, index) => {
      const x = max === min ? 360 : 48 + ((sample.unix - min) / (max - min)) * 560;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${socY(sample.socPct).toFixed(1)}`;
    })
    .join(" ");
}
