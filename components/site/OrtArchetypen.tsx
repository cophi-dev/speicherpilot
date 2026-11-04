"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ModelChip } from "@/components/day-ring/ModelChip";
import { useLanguage } from "@/components/language-context";
import { archetypeByKey, badgeForArchetype } from "@/lib/ortArchetypes";
import type { OrtMode } from "@/lib/ortArchetypesSchema";
import { NETZ_PALETTE } from "@/lib/netzPalette";
import { sitePath } from "@/lib/perspective";

const CORE =
  "Netzdienlich ist keine Eigenschaft der Batterie. Es ergibt sich aus Ort, Uhrzeit und Vertrag.";

export function OrtArchetypen({ initialArchetype = "land" }: { initialArchetype?: "land" | "stadt" }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const [archetype, setArchetype] = useState<"land" | "stadt">(initialArchetype);
  const [mode, setMode] = useState<OrtMode>("markt");
  const data = useMemo(() => archetypeByKey(archetype), [archetype]);
  const badge = useMemo(() => badgeForArchetype(data, mode), [data, mode]);
  const series = data.series.modes[mode];
  const palette = NETZ_PALETTE.paper;

  const badgeText =
    badge.id === "netzdienlich"
      ? tx("netzdienlich (Modell)", "grid-supportive (model)")
      : badge.id === "belastend"
        ? tx("belastend (Modell)", "burdensome (model)")
        : tx("neutral (Modell)", "neutral (model)");

  return (
    <div className="ort-archetypen day-paper">
      <div className="day-hero-inner">
        <p className="site-netz-principle v4-subline" role="note">
          {CORE}
        </p>
        <h2 className="v4-h2">
          {tx(
            "Derselbe Speicher, derselbe Preis, zwei Orte. Wann hilft er dem Netz, wann belastet er es, und welcher Vertrag bringt beides zusammen?",
            "Same storage, same price, two places. When does it help the grid, when does it burden it, and which contract aligns both?",
          )}
        </h2>

        <div className="v4-tab-bar site-toggle" role="tablist" aria-label={tx("Netztyp", "Grid type")}>
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

        <p className="v4-subline">
          {data.labelDe} · {tx("Typtag Netzlast", "Typical-day grid load")} {data.typtag} ·{" "}
          {tx("Preis", "Price")} {data.priceDay}.{" "}
          {tx(
            "Netzlast: SimBench-Typtag; Preis: echter Tag. Die Kombination ist ein Modell, kein gemeinsames Wetter.",
            "Grid load: SimBench typical day; price: real day. The combination is a model, not shared weather.",
          )}
        </p>

        <div className="v4-tab-bar site-toggle" role="tablist" aria-label={tx("Fahrweise", "Operation mode")}>
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

        <ArchetypeDayChart
          hours={data.series.hour}
          l0n0={data.series.L0n0}
          l0n1={data.series.L0n1}
          l1n1={series.L1n1}
          charge={series.c}
          discharge={series.d}
          windowQh={data.windowQh}
          palette={palette}
          ariaLabel={tx("Tagesauslastung am Engpass", "Daily loading at the bottleneck")}
        />

        <ul className="site-stats ort-archetype-stats">
          <li>
            <span className="site-badge">{badgeText}</span>
            {badge.hint ? <span className="site-quiet"> · {badge.hint}</span> : null}
          </li>
          <li>
            {tx("Viertelstunden über 100 % im Ausfall", "Quarter-hours over 100 % in contingency")}:{" "}
            {tx("ohne Speicher", "without storage")} {data.over100Qh.n0} · {tx("mit Speicher", "with storage")}{" "}
            {mode === "markt" ? data.over100Qh.n1Markt : mode === "vertrag" ? data.over100Qh.n1Vertrag : data.over100Qh.n1Netz}
          </li>
          <li>
            {tx("Modellerlös 12 Monate", "Model revenue 12 months")}:{" "}
            {data.revenuePct12m[mode].toFixed(1)} % {tx("von Markt", "of market")}
          </li>
        </ul>

        <p className="v4-subline">
          {tx("Fest bis", "Firm up to")} {data.xMw.toFixed(1)} MW, {tx("flexibel bis", "flexible up to")}{" "}
          {data.yMw.toFixed(1)} MW ({tx("kritische Richtung am Engpass", "critical direction at the bottleneck")}).
          {data.xLimitedByBase
            ? ` ${tx("Die feste Grenze ist schon durch die Ausgangslast begrenzt.", "The firm limit is already constrained by base load.")}`
            : null}
        </p>

        <p className="v4-subline">
          {tx("Konfliktviertelstunden (12 Monate, Day-ahead, Modell)", "Conflict quarter-hours (12 months, day-ahead, model)")}:{" "}
          {data.conflicts12m.qh} {tx("Viertelstunden", "quarter-hours")}, {data.conflicts12m.days}{" "}
          {tx("Tage", "days")}, {data.conflicts12m.mwh.toFixed(1)} MWh.
        </p>

        {data.warnings.length > 0 ? (
          <p className="site-quiet" role="note">
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
  hours,
  l0n0,
  l0n1,
  l1n1,
  charge,
  discharge,
  windowQh,
  palette,
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
        <text x={pad.l} y={H - 8} className="num" fontSize={11}>
          0
        </text>
        <text x={pad.l - 4} y={y(100) + 4} className="num" fontSize={11} textAnchor="end">
          100 %
        </text>
        <text x={W - pad.r} y={H - 8} className="num" fontSize={11} textAnchor="end">
          24 h
        </text>
      </svg>
      <figcaption className="site-quiet">
        % Auslastung am Engpass · Normalbetrieb und (n-1) · Speicherleistung als Balken
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
