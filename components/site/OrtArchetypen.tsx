"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useLanguage } from "@/components/language-context";
import { archetypeByKey, badgeForArchetype } from "@/lib/ortArchetypes";
import type { OrtArchetype, OrtMode } from "@/lib/ortArchetypesSchema";
import { NETZ_PALETTE } from "@/lib/netzPalette";
import { sitePath } from "@/lib/perspective";

function deNum(value: number, fraction = 1): string {
  return value.toLocaleString("de-DE", { minimumFractionDigits: fraction, maximumFractionDigits: fraction });
}

function countQhOver100(values: number[]): number {
  return values.filter((v) => v > 100).length;
}

function explainBadge(
  badge: ReturnType<typeof badgeForArchetype>,
  tx: (de: string, en: string) => string,
): string {
  if (badge.id === "netzdienlich") {
    return tx(
      "Netzdienlich (Modell): In engen Zeiten entlastet der Speicher die Leitung, ohne neue Überschreitungen über 100 % zu erzeugen.",
      "Grid-supportive (model): In tight periods the storage relieves the line without creating new excursions above 100 %.",
    );
  }
  if (badge.id === "belastend") {
    return tx(
      "Belastend (Modell): Der Speicher verschärft die Leitung und treibt sie in Viertelstunden über 100 % hinaus.",
      "Burdensome (model): The storage worsens loading and pushes the line above 100 % in some quarter-hours.",
    );
  }
  return tx(
    "Neutral (Modell): Weder klare Entlastung noch klare Verschärfung am Engpass — oder kein kritischer Bereich an diesem Tag.",
    "Neutral (model): Neither clear relief nor clear worsening at the bottleneck — or no critical band on this day.",
  );
}

function explainOrtChoice(
  archetype: "land" | "stadt",
  data: OrtArchetype,
  tx: (de: string, en: string) => string,
): string {
  if (archetype === "land") {
    if (data.scenarioDe) {
      if (!data.hasEngpass) {
        return tx(
          `${data.scenarioDe} Am gewählten Typtag bleibt die Leitung unter 90 % — im Modell kein Engpass, daher keine festen Anschlusswerte X/Y.`,
          `${data.scenarioDe} On this typical day the line stays below 90 % — no bottleneck in the model, so no firm X/Y values.`,
        );
      }
      return tx(
        `${data.scenarioDe} Mittags dominiert Einspeisung: Am Engpass erreicht die Leitung bis ${deNum(data.peakN1Pct, 1)} % Auslastung bei Netzausfall (n-1).`,
        `${data.scenarioDe} Midday feed-in dominates: at the bottleneck loading reaches up to ${deNum(data.peakN1Pct, 1)} % under contingency (n-1).`,
      );
    }
  }
  const overMarkt = countQhOver100(data.series.modes.markt.L1n1);
  if (overMarkt > 0) {
    return tx(
      `Abends steigt der Bezug: In ${deNum(overMarkt, 0)} Viertelstunden überschreitet die Leitung im Markt-Modell die 100-%-Grenze (n-1).`,
      `Evening demand rises: in ${deNum(overMarkt, 0)} quarter-hours the line exceeds 100 % in the market mode (n-1).`,
    );
  }
  return tx(
    "Städtischer Typtag mit hohem Restbezug — Engpassfenster abends im Modell markiert.",
    "Urban typical day with high residual demand — evening bottleneck window in the model.",
  );
}

function explainModeChoice(
  mode: OrtMode,
  data: OrtArchetype,
  tx: (de: string, en: string) => string,
): string {
  const series = data.series.modes[mode];
  const over = countQhOver100(series.L1n1);
  const rev = data.revenuePct12m[mode];
  if (mode === "markt") {
    return tx(
      over > 0
        ? `Markt: Der Speicher handelt Day-ahead-Preise. Mit Speicher überschreitet die Leitung in ${deNum(over, 0)} Viertelstunden 100 % (n-1). Modellerlös ≈ ${deNum(rev, 1)} % vom Markt.`
        : `Markt: Der Speicher handelt Day-ahead-Preise ohne Überschreitung über 100 % an diesem Tag. Modellerlös ≈ ${deNum(rev, 1)} % vom Markt.`,
      over > 0
        ? `Market: storage trades day-ahead prices. With storage the line exceeds 100 % in ${deNum(over, 0)} quarter-hours (n-1). Model revenue ≈ ${deNum(rev, 1)} % of market.`
        : `Market: day-ahead trading without exceeding 100 % on this day. Model revenue ≈ ${deNum(rev, 1)} % of market.`,
    );
  }
  if (mode === "vertrag") {
    return tx(
      `Markt + flexibler Vertrag: Im Engpassfenster ist eine Richtung gesperrt (n-1). Überschreitungen > 100 %: ${deNum(over, 0)} qh. Modellerlös ≈ ${deNum(rev, 1)} % vom Markt.`,
      `Market + flexible contract: one direction blocked in the bottleneck window (n-1). Excursions > 100 %: ${deNum(over, 0)} qh. Model revenue ≈ ${deNum(rev, 1)} % of market.`,
    );
  }
  return tx(
    `Netzorientiert: Der Speicher vermeidet gleichzeitiges Laden und Entladen und priorisiert Entlastung. Überschreitungen > 100 %: ${deNum(over, 0)} qh. Modellerlös ≈ ${deNum(rev, 1)} % vom Markt.`,
    `Grid-oriented: avoids simultaneous charge and discharge and prioritises relief. Excursions > 100 %: ${deNum(over, 0)} qh. Model revenue ≈ ${deNum(rev, 1)} % of market.`,
  );
}

export function OrtArchetypen({ initialArchetype = "land" }: { initialArchetype?: "land" | "stadt" }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const [archetype, setArchetype] = useState<"land" | "stadt">(initialArchetype);
  const [mode, setMode] = useState<OrtMode>("markt");
  const data = useMemo(() => archetypeByKey(archetype), [archetype]);
  const badge = useMemo(() => badgeForArchetype(data, mode), [data, mode]);
  const series = data.series.modes[mode];
  const palette = NETZ_PALETTE.paper;

  const badgeLabel =
    badge.id === "netzdienlich"
      ? tx("netzdienlich (Modell)", "grid-supportive (model)")
      : badge.id === "belastend"
        ? tx("belastend (Modell)", "burdensome (model)")
        : tx("neutral (Modell)", "neutral (model)");

  const over100 =
    mode === "markt" ? data.over100Qh.n1Markt : mode === "vertrag" ? data.over100Qh.n1Vertrag : data.over100Qh.n1Netz;

  const ortHint = explainOrtChoice(archetype, data, tx);
  const modeHint = explainModeChoice(mode, data, tx);
  const badgeExplain = explainBadge(badge, tx);

  return (
    <div className="ort-archetypen day-paper">
      <div className="day-hero-inner">
        <p className="ort-netz-lead">
          {tx(
            "Dieselbe Speichergröße an zwei SimBench-Orten: Sie wählen Ort und Fahrweise und sehen, wie Leitung und Speicher den Tag über ausgelastet sind.",
            "The same storage size at two SimBench sites: pick place and operation mode to see how the line and storage load through the day.",
          )}
        </p>

        <div className="ort-netz-step">
          <p className="ort-netz-step-label">{tx("1. Ort wählen", "1. Choose place")}</p>
          <div className="ort-netz-tabs v4-tab-bar site-toggle" role="tablist" aria-label={tx("Ort", "Place")}>
            {(["land", "stadt"] as const).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={archetype === key}
                className={archetype === key ? "is-active" : undefined}
                onClick={() => setArchetype(key)}
              >
                {key === "land" ? tx("Land", "Rural") : tx("Stadt", "Urban")}
              </button>
            ))}
          </div>
          <p className="ort-netz-step-note">{ortHint}</p>
        </div>

        <div className="ort-netz-step">
          <p className="ort-netz-step-label">{tx("2. Fahrweise wählen", "2. Choose operation mode")}</p>
          <div className="ort-netz-tabs v4-tab-bar site-toggle" role="tablist" aria-label={tx("Fahrweise", "Operation mode")}>
            {(
              [
                ["markt", tx("Markt", "Market")],
                ["vertrag", tx("Markt + flexibler Vertrag", "Market + flexible contract")],
                ["netz", tx("Netzorientiert", "Grid-oriented")],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                className={mode === id ? "is-active" : undefined}
                onClick={() => setMode(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="ort-netz-step-note">{modeHint}</p>
        </div>

        <p className="v4-subline ort-netz-meta">
          {data.labelDe}
          {data.scenarioDe ? ` · ${data.scenarioDe}` : null} · {tx("Typtag Netzlast", "Typical-day grid load")}{" "}
          {data.typtag} · {tx("Preis", "Price")} {data.priceDay}.{" "}
          {tx(
            "Netzlast SimBench 2016, Preis eigener Kalender — kein gemeinsames Wetter.",
            "Grid load SimBench 2016, prices from another calendar — not shared weather.",
          )}
        </p>

        <ArchetypeDayChart
          hours={data.series.hour}
          l0n0={data.series.L0n0}
          l0n1={data.series.L0n1}
          l1n1={series.L1n1}
          charge={series.c}
          discharge={series.d}
          windowQh={data.windowQh}
          palette={palette}
          tx={tx}
          ariaLabel={tx("Tagesauslastung am Engpass", "Daily loading at the bottleneck")}
        />

        <dl className="ort-archetype-kpi-grid">
          <div>
            <dt>{tx("Einschätzung (n-1)", "Assessment (n-1)")}</dt>
            <dd>
              <span className="site-badge ort-archetype-badge">{badgeLabel}</span>
              <p className="ort-kpi-explain">{badgeExplain}</p>
            </dd>
          </div>
          <div>
            <dt>{tx("Fest / flexibel (n-1 / n-0)", "Firm / flexible (n-1 / n-0)")}</dt>
            <dd className="num">
              {data.hasEngpass && data.xMw != null && data.yMw != null
                ? `${deNum(data.xMw, 1)} / ${deNum(data.yMw, 1)} MW`
                : tx("Kein Engpass ≥ 90 % — X/Y entfallen", "No ≥ 90 % bottleneck — X/Y omitted")}
            </dd>
            <dd className="ort-kpi-explain">
              {tx(
                "Fest = in allen Viertelstunden und Richtungen sicher unter n-1; flexibel = nur erlaubte Richtung je Viertelstunde (n-0).",
                "Firm = safe in every quarter-hour and direction under n-1; flexible = allowed direction per quarter-hour (n-0).",
              )}
            </dd>
          </div>
          <div>
            <dt>{tx("Konflikte 12 Monate", "Conflicts 12 months")}</dt>
            <dd className="num">
              {deNum(data.conflicts12m.qh, 0)} qh · {deNum(data.conflicts12m.days, 0)} {tx("Tage", "days")} ·{" "}
              {deNum(data.conflicts12m.mwh, 1)} MWh
            </dd>
            <dd className="ort-kpi-explain">
              {tx(
                "Tage, an denen Markt-Fahrplan und Engpass unter n-1 kollidieren (Modell, gekoppelt SimBench 2016 + Preise).",
                "Days when market dispatch clashes with the n-1 bottleneck (model, SimBench 2016 + prices).",
              )}
            </dd>
          </div>
          <div>
            <dt>{tx("Modellerlös", "Model revenue")}</dt>
            <dd className="num">
              {deNum(data.revenuePct12m[mode], 1)} % {tx("von Markt", "of market")}
            </dd>
            <dd className="ort-kpi-explain">
              {tx("Jahreserlös dieser Fahrweise relativ zum reinen Markt-Modus.", "Annual revenue vs pure market mode.")}
            </dd>
          </div>
          <div>
            <dt>{tx("qh > 100 % (Ausfall)", "qh > 100 % (contingency)")}</dt>
            <dd className="num">
              {tx("ohne Speicher", "without storage")} {data.over100Qh.n0} · {tx("mit Speicher", "with storage")}{" "}
              {over100}
            </dd>
            <dd className="ort-kpi-explain">
              {tx(
                "Viertelstunden über der 100-%-Grenze am Engpass — zuerst ohne Speicher, dann mit gewählter Fahrweise.",
                "Quarter-hours above 100 % at the bottleneck — without storage, then with selected mode.",
              )}
            </dd>
          </div>
          <div>
            <dt>{tx("Engpass max (n-1)", "Bottleneck max (n-1)")}</dt>
            <dd className="num">{deNum(data.peakN1Pct, 1)} %</dd>
            <dd className="ort-kpi-explain">
              {tx(
                "Höchste Auslastung am Engpasselement bei Netzausfall (n-1) am Typtag.",
                "Peak loading on the bottleneck element under contingency (n-1) on the typical day.",
              )}
            </dd>
          </div>
        </dl>

        {data.warnings.length > 0 ? (
          <p className="ort-netz-warning" role="note">
            {data.warnings.join(" ")}
          </p>
        ) : null}

        <p className="v4-subline">
          {tx(
            "Nur der Netzbetreiber beurteilt den realen Fall (BGH EnVR 1/24).",
            "Only the grid operator assesses the real case (BGH EnVR 1/24).",
          )}
        </p>

        <p className="day-cta-row">
          <Link href={sitePath("projekt", "ladepark")} className="day-cta">
            {tx("Zur Projektierer-Sicht (Ladepark) →", "To developer view (charging hub) →")}
          </Link>
        </p>
      </div>
    </div>
  );
}

function ArchetypeDayChart({
  hours: _hours,
  l0n0,
  l0n1,
  l1n1,
  charge,
  discharge,
  windowQh,
  palette,
  tx,
  ariaLabel,
}: {
  hours: number[];
  l0n0: number[];
  l0n1: number[];
  l1n1: number[];
  charge: number[];
  discharge: number[];
  windowQh: number[];
  palette: (typeof NETZ_PALETTE)["paper"];
  tx: (de: string, en: string) => string;
  ariaLabel: string;
}) {
  const W = 960;
  const H = 280;
  const pad = { l: 48, r: 16, t: 16, b: 40 };
  const n = Math.min(l0n0.length, 96);
  const maxY = Math.max(110, ...l0n0.slice(0, n), ...l1n1.slice(0, n));
  const x = (i: number) => pad.l + (i / (n - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / maxY) * (H - pad.t - pad.b);
  const line = (vals: number[]) =>
    vals
      .slice(0, n)
      .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
      .join(" ");

  return (
    <figure className="ort-archetype-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="v4-ort-chart">
        <line x1={pad.l} x2={W - pad.r} y1={y(100)} y2={y(100)} stroke={palette.lineOver100} strokeDasharray="4 4" />
        {windowQh.map((qh) => (
          <rect
            key={qh}
            x={x(qh)}
            width={Math.max(2, (W - pad.l - pad.r) / n)}
            y={pad.t}
            height={H - pad.t - pad.b}
            fill="currentColor"
            opacity={0.06}
          />
        ))}
        {Array.from({ length: n }).map((_, i) => {
          const c = charge[i] ?? 0;
          const d = discharge[i] ?? 0;
          const h = Math.max(c, d);
          if (h <= 0) return null;
          return (
            <rect
              key={i}
              x={x(i) - 2}
              width={4}
              y={y(h)}
              height={y(0) - y(h)}
              fill={palette.storageRing}
              opacity={0.35}
            />
          );
        })}
        <path d={line(l0n0)} fill="none" stroke={palette.lineBelow80} strokeWidth={1.5} />
        <path d={line(l0n1)} fill="none" stroke={palette.line80to100} strokeWidth={1.5} strokeDasharray="6 4" />
        <path d={line(l1n1)} fill="none" stroke={palette.lineOver100} strokeWidth={2} />
        <text x={pad.l} y={H - 8} className="num ort-chart-axis" fontSize={11}>
          0
        </text>
        <text x={pad.l - 4} y={y(100) + 4} className="num ort-chart-axis" fontSize={11} textAnchor="end">
          100 %
        </text>
        <text x={W - pad.r} y={H - 8} className="num ort-chart-axis" fontSize={11} textAnchor="end">
          24 h
        </text>
      </svg>
      <figcaption className="ort-chart-caption">
        <ul className="ort-chart-legend">
          <li>
            <span className="ort-legend-swatch ort-legend-n0" aria-hidden />{" "}
            {tx("Leitung ohne Speicher (Normalbetrieb n-0)", "Line without storage (n-0)")}
          </li>
          <li>
            <span className="ort-legend-swatch ort-legend-n1" aria-hidden />{" "}
            {tx("Leitung bei Netzausfall ohne Speicher (n-1)", "Line under outage without storage (n-1)")}
          </li>
          <li>
            <span className="ort-legend-swatch ort-legend-l1" aria-hidden />{" "}
            {tx("Leitung mit Speicher (n-1)", "Line with storage (n-1)")}
          </li>
          <li>
            <span className="ort-legend-swatch ort-legend-bar" aria-hidden />{" "}
            {tx("Speicherleistung (Laden/Entladen)", "Storage power (charge/discharge)")}
          </li>
          <li>{tx("Schattierung = Engpassfenster (flexibler Vertrag)", "Shading = bottleneck window (flexible contract)")}</li>
        </ul>
      </figcaption>
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th>qh</th>
            <th>L0 n0</th>
            <th>L0 n1</th>
            <th>L1 n1</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: n }).map((_, i) => (
            <tr key={i}>
              <td>{i}</td>
              <td>{l0n0[i]?.toFixed(1)}</td>
              <td>{l0n1[i]?.toFixed(1)}</td>
              <td>{l1n1[i]?.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
