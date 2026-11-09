"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useLanguage } from "@/components/language-context";
import { archetypeByKey, badgeForArchetype, type BadgeV2Result } from "@/lib/ortArchetypes";
import type { OrtArchetype, OrtBadgeId, OrtMode } from "@/lib/ortArchetypesSchema";
import { NETZ_PALETTE } from "@/lib/netzPalette";
import { sitePath } from "@/lib/perspective";

function deNum(value: number, fraction = 1): string {
  return value.toLocaleString("de-DE", { minimumFractionDigits: fraction, maximumFractionDigits: fraction });
}

function usePrefersDarkChart(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

const BADGE_PREVIEW_IDS = new Set<OrtBadgeId>(["nicht_bewertet"]);

function ortArchetypeBadgeClass(id: OrtBadgeId): string {
  return `site-badge ort-archetype-badge ort-archetype-badge--${id.replaceAll("_", "-")}`;
}

function previewBadge(id: OrtBadgeId): BadgeV2Result {
  return {
    id,
    criticalHours: 0,
    over100Before: 0,
    over100After: 0,
    hint: "Vorschau für Designabnahme — nicht bewertet",
  };
}

function showConnectionMw(data: OrtArchetype): boolean {
  if (data.xMw == null || data.yMw == null) {
    return false;
  }
  if (data.hasEngpass) {
    return true;
  }
  return data.xMw >= 0.1 || data.yMw >= 0.1;
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
  if (badge.id === "nicht_bewertet") {
    return tx(
      "Nicht bewertet (Modell): Zeitreihe fehlt, ist ungleich lang oder enthält ungültige Werte.",
      "Not assessed (model): time series missing, unequal length or contains invalid values.",
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
          `${data.scenarioDe} An diesem Mustertag bleibt die Leitung unter 90 % — kein Engpass, daher keine festen Anschlusswerte X/Y.`,
          `${data.scenarioDe} On this sample day the line stays below 90 % — no bottleneck, so no firm X/Y values.`,
        );
      }
      return tx(
        `${data.scenarioDe} An diesem Mustertag dominiert Einspeisung: Am Engpass bis ${deNum(data.peakN1Pct, 1)} % Auslastung bei Netzausfall (n-1).`,
        `${data.scenarioDe} On this sample day feed-in dominates: up to ${deNum(data.peakN1Pct, 1)} % loading at the bottleneck under contingency (n-1).`,
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
  const rev = data.revenuePctTyptag[mode];
  if (mode === "markt") {
    return tx(
      over > 0
        ? `Markt am Mustertag: Day-ahead-Preise. Mit Speicher überschreitet die Leitung in ${deNum(over, 0)} Viertelstunden 100 % (n-1). Modellerlös am Tag ≈ ${deNum(rev, 1)} % vom Markt.`
        : `Markt am Mustertag: Day-ahead ohne Überschreitung über 100 %. Modellerlös ≈ ${deNum(rev, 1)} % vom Markt.`,
      over > 0
        ? `Market on the sample day: day-ahead prices. With storage the line exceeds 100 % in ${deNum(over, 0)} quarter-hours (n-1). Model revenue ≈ ${deNum(rev, 1)} % of market.`
        : `Market on the sample day without exceeding 100 %. Model revenue ≈ ${deNum(rev, 1)} % of market.`,
    );
  }
  if (mode === "vertrag") {
    return tx(
      `Vertrag am Mustertag: Im Engpassfenster ist eine Richtung gesperrt (n-1). Überschreitungen > 100 %: ${deNum(over, 0)} qh. Modellerlös ≈ ${deNum(rev, 1)} % vom Markt.`,
      `Contract on the sample day: one direction blocked in the bottleneck window (n-1). Excursions > 100 %: ${deNum(over, 0)} qh. Model revenue ≈ ${deNum(rev, 1)} % of market.`,
    );
  }
  return tx(
    `Netzorientiert am Mustertag: Entlastung priorisieren, kein gleichzeitiges Laden/Entladen. Überschreitungen > 100 %: ${deNum(over, 0)} qh. Modellerlös ≈ ${deNum(rev, 1)} % vom Markt.`,
    `Grid-oriented on the sample day: prioritise relief, no simultaneous charge and discharge. Excursions > 100 %: ${deNum(over, 0)} qh. Model revenue ≈ ${deNum(rev, 1)} % of market.`,
  );
}

export function OrtArchetypen({ initialArchetype = "land" }: { initialArchetype?: "land" | "stadt" }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const searchParams = useSearchParams();
  const [archetype, setArchetype] = useState<"land" | "stadt">(initialArchetype);
  const [mode, setMode] = useState<OrtMode>("markt");
  const data = useMemo(() => archetypeByKey(archetype), [archetype]);
  const badge = useMemo(() => {
    const preview = searchParams.get("badgePreview");
    if (preview && BADGE_PREVIEW_IDS.has(preview as OrtBadgeId)) {
      return previewBadge(preview as OrtBadgeId);
    }
    return badgeForArchetype(data, mode);
  }, [data, mode, searchParams]);
  const series = data.series.modes[mode];
  const prefersDark = usePrefersDarkChart();
  const palette = NETZ_PALETTE[prefersDark ? "night" : "paper"];

  const badgeLabel =
    badge.id === "netzdienlich"
      ? tx("netzdienlich (Modell)", "grid-supportive (model)")
      : badge.id === "belastend"
        ? tx("belastend (Modell)", "burdensome (model)")
        : badge.id === "nicht_bewertet"
          ? tx("nicht bewertet (Modell)", "not assessed (model)")
          : tx("neutral (Modell)", "neutral (model)");

  const over100 =
    mode === "markt" ? data.over100Qh.n1Markt : mode === "vertrag" ? data.over100Qh.n1Vertrag : data.over100Qh.n1Netz;

  const ortHint = explainOrtChoice(archetype, data, tx);
  const modeHint = explainModeChoice(mode, data, tx);
  const badgeExplain = explainBadge(badge, tx);

  return (
    <div className="ort-archetypen day-paper">
      <div className="day-hero-inner">
        <div className="ort-netz-step">
          <p className="ort-netz-step-label">{tx("1. Ort wählen", "1. Choose place")}</p>
          <div className="ort-netz-tabs ort-netz-tabs--place v4-tab-bar site-toggle" role="tablist" aria-label={tx("Ort", "Place")}>
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
          <div
            className="ort-netz-tabs ort-netz-tabs--mode v4-tab-bar site-toggle"
            role="tablist"
            aria-label={tx("Fahrweise", "Operation mode")}
          >
            {(
              [
                ["markt", tx("Markt", "Market"), tx("Markt", "Market")],
                [
                  "vertrag",
                  tx("Markt + flexibel", "Market + flexible"),
                  tx("Markt + flexibler Vertrag", "Market + flexible contract"),
                ],
                ["netz", tx("Netzorientiert", "Grid-oriented"), tx("Netzorientiert", "Grid-oriented")],
              ] as const
            ).map(([id, label, aria]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                aria-label={aria}
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
          {data.scenarioDe ? ` · ${data.scenarioDe}` : null} · {tx("Mustertag Netzlast", "Sample-day grid load")}{" "}
          {data.typtag} · {tx("Preis", "Price")} {data.priceDay}.
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
          emphasizeStrokes={prefersDark}
          tx={tx}
          ariaLabel={tx(
            "Tagesauslastung am Engpass. Uhrzeit Mustertag horizontal, Auslastung der Leitung in Prozent vertikal.",
            "Daily loading at the bottleneck. Sample-day time horizontal, line loading in percent vertical.",
          )}
        />

        <footer className="v4-day-footnotes">
          <dl className="v4-day-notes">
            <div>
              <dt>{tx("Modell", "Model")}</dt>
              <dd className="ort-netz-nutzen">
                {tx(
                  "Hier vergleichen Sie zwei Musterorte (ländlicher Netzknoten und Stadtnetz) und drei Fahrweisen (Markt, Markt + flexibel, Netzorientiert) an einem typischen Tag. Kein eigener Standort, keine freie Leistung, kein Baukasten-Netz.",
                  "Here you compare two sample places (rural grid node and urban grid) and three operating modes (market, market + flexible, grid-oriented) on a typical day. No custom site, no free capacity, no build-your-own grid.",
                )}
              </dd>
              <dd>
                {tx(
                  "Alle Kennzahlen unten beziehen sich auf diesen Mustertag — nicht auf ein Kalenderjahr.",
                  "All figures below refer to this sample day — not a calendar year.",
                )}
              </dd>
            </div>
            <div>
              <dt>{tx("Netz", "Grid")}</dt>
              <dd>
                {tx(
                  "Nur der Netzbetreiber beurteilt den realen Fall (BGH EnVR 1/24).",
                  "Only the grid operator assesses the real case (BGH EnVR 1/24).",
                )}
              </dd>
              <dd>
                <Link href="/methodik" className="v4-footnote-link">
                  {tx("Methodik", "Method")}
                </Link>
              </dd>
            </div>
          </dl>
        </footer>

        <dl className="ort-archetype-kpi-grid">
          <div>
            <dt>{tx("Einschätzung am Mustertag (n-1)", "Assessment on sample day (n-1)")}</dt>
            <dd>
              <span className={ortArchetypeBadgeClass(badge.id)}>
                {badge.id === "belastend" ? (
                  <span className="ort-archetype-badge__dot" aria-hidden="true" />
                ) : null}
                {badgeLabel}
              </span>
              <p className="ort-kpi-explain">{badgeExplain}</p>
            </dd>
          </div>
          <div>
            <dt>{tx("Fest / flexibel (n-1 / n-0)", "Firm / flexible (n-1 / n-0)")}</dt>
            <dd className="num">
              {showConnectionMw(data)
                ? `${deNum(data.xMw ?? 0, 1)} / ${deNum(data.yMw ?? 0, 1)} MW`
                : tx("Am Mustertag kein Engpass ≥ 90 % — X/Y entfallen", "No ≥ 90 % bottleneck on sample day — X/Y omitted")}
            </dd>
            <dd className="ort-kpi-explain">
              {tx(
                "Fest = in allen Viertelstunden und Richtungen sicher unter n-1; flexibel = nur erlaubte Richtung je Viertelstunde (n-0).",
                "Firm = safe in every quarter-hour and direction under n-1; flexible = allowed direction per quarter-hour (n-0).",
              )}
            </dd>
          </div>
          <div>
            <dt>{tx("Modellerlös am Mustertag", "Model revenue on sample day")}</dt>
            <dd className="num">
              {deNum(data.revenuePctTyptag[mode], 1)} % {tx("vom Markt am selben Tag", "of market on that day")}
            </dd>
            <dd className="ort-kpi-explain">
              {tx(
                "Day-ahead-Erlös dieser Fahrweise am Mustertag relativ zum reinen Markt-Modus — Modellschätzung.",
                "Day-ahead revenue of this mode on the sample day vs pure market mode — model estimate.",
              )}
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
            <dt>{tx("Engpass max am Mustertag (n-1)", "Bottleneck max on sample day (n-1)")}</dt>
            <dd className="num">{deNum(data.peakN1Pct, 1)} %</dd>
            <dd className="ort-kpi-explain">
              {tx(
                "Höchste Auslastung am Engpasselement bei Netzausfall (n-1) an diesem Mustertag.",
                "Peak loading on the bottleneck element under contingency (n-1) on this sample day.",
              )}
            </dd>
          </div>
        </dl>

        {data.warnings.length > 0 ? (
          <p className="ort-netz-warning" role="note">
            {data.warnings.join(" ")}
          </p>
        ) : null}

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
  emphasizeStrokes = false,
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
  emphasizeStrokes?: boolean;
  tx: (de: string, en: string) => string;
  ariaLabel: string;
}) {
  const strokeThin = emphasizeStrokes ? 2.25 : 1.5;
  const strokeThick = emphasizeStrokes ? 3 : 2;
  const W = 960;
  const H = 300;
  const pad = { l: 72, r: 16, t: 16, b: 58 };
  const n = Math.min(l0n0.length, 96);
  const maxY = Math.max(110, ...l0n0.slice(0, n), ...l1n1.slice(0, n));
  const x = (i: number) => pad.l + (i / (n - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / maxY) * (H - pad.t - pad.b);
  const line = (vals: number[]) =>
    vals
      .slice(0, n)
      .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
      .join(" ");

  const shellRef = useRef<HTMLDivElement>(null);
  const [fontScale, setFontScale] = useState(W / 335);

  useEffect(() => {
    const node = shellRef.current;
    if (!node) {
      return undefined;
    }
    const sync = () => {
      const width = node.clientWidth;
      if (width > 0) {
        setFontScale(W / width);
      }
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  /** Screen px × (viewBox / render width) → SVG user units (constant apparent size). */
  const svgFont = (screenPx: number) => screenPx * fontScale;
  const titleFont = svgFont(14);
  const tickFont = svgFont(12);

  return (
    <figure
      className="ort-archetype-chart"
      style={
        {
          "--ort-line-n0": palette.lineBelow80,
          "--ort-line-n1": palette.line80to100,
          "--ort-line-l1": palette.lineOver100,
        } as React.CSSProperties
      }
    >
      <div className="ort-archetype-chart-frame">
        <p className="ort-chart-axis-html-y" aria-hidden="true">
          {tx("Auslastung der Leitung in %", "Line loading in %")}
        </p>
        <div ref={shellRef} className="ort-archetype-chart-shell">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={ariaLabel}
            className="v4-ort-chart ort-archetype-chart-svg"
            overflow="visible"
          >
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
        <path d={line(l0n0)} fill="none" stroke={palette.lineBelow80} strokeWidth={strokeThin} />
        <path d={line(l0n1)} fill="none" stroke={palette.line80to100} strokeWidth={strokeThin} strokeDasharray="6 4" />
        <path d={line(l1n1)} fill="none" stroke={palette.lineOver100} strokeWidth={strokeThick} />
        <text x={pad.l} y={H - 14} className="num ort-chart-axis" fontSize={tickFont}>
          0
        </text>
        <text x={pad.l - 4} y={y(100) + 4} className="num ort-chart-axis" fontSize={tickFont} textAnchor="end">
          100 %
        </text>
        <text x={W - pad.r} y={H - 14} className="num ort-chart-axis" fontSize={tickFont} textAnchor="end">
          24 h
        </text>
        <text
          x={(pad.l + W - pad.r) / 2}
          y={H - 4}
          className="ort-chart-axis-title"
          fontSize={titleFont}
          textAnchor="middle"
        >
          {tx("Uhrzeit (Mustertag)", "Time (sample day)")}
        </text>
      </svg>
        </div>
      </div>
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
          <li>
            {tx(
              "vmin/vmax: pandapower-Baseline ohne Speicher — keine abgebildete Spannungswirkung des Mustertags-Dispatch.",
              "vmin/vmax: pandapower baseline without storage — no modelled voltage effect from the sample-day dispatch.",
            )}
          </li>
        </ul>
      </figcaption>
      <div className="day-sr">
        <table>
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
      </div>
    </figure>
  );
}
