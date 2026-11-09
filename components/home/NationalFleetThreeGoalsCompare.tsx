import Link from "next/link";

import styles from "@/components/home/NationalFleetThreeGoalsCompare.module.css";
import { formatQuantity } from "@/lib/formatQuantity";
import {
  fleetMonatHref,
  NATIONAL_FLEET_FACTORS,
  NATIONAL_FLEET_STRATEGY_UI,
  type NationalFleetFactor,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";
import { threeGoalsSummarySentence } from "@/lib/marktInsights";
import type { ThreeGoalsCompareModel } from "@/lib/nationalFleetThreeGoals";

const STRATEGY_ORDER: NationalFleetStrategyUi[] = ["ueberschuss", "spitze", "markt"];

const STRATEGY_CLASS: Record<NationalFleetStrategyUi, string> = {
  ueberschuss: styles.barUeberschuss,
  spitze: styles.barSpitze,
  markt: styles.barMarkt,
};

function fmtGw(gw: number): string {
  return formatQuantity(gw, "de", 2);
}

export function NationalFleetThreeGoalsCompare({
  model,
  monthKey,
  activeFactor,
  activeStrategy,
  marktPeakFootnote,
}: {
  model: ThreeGoalsCompareModel;
  monthKey: string;
  activeFactor: NationalFleetFactor;
  activeStrategy: NationalFleetStrategyUi;
  marktPeakFootnote?: string | null;
}) {
  const peakValues = model.rows.flatMap((r) => r.cells.map((c) => c.peakAfterGw));
  const yMax = Math.max(model.refPeakGw, ...peakValues, 1);
  const yPad = yMax * 0.08;
  const chartMax = yMax + yPad;
  const barGroupW = 56;
  const barW = 22;
  const gap = 6;
  const groups = NATIONAL_FLEET_FACTORS.length;
  const width = 48 + groups * (barGroupW + 12);
  const height = 200;
  const plotH = 140;
  const plotTop = 28;

  const y = (gw: number) => plotTop + plotH - (gw / chartMax) * plotH;
  const refY = y(model.refPeakGw);

  const summary = threeGoalsSummarySentence(model);

  return (
    <section className={`v4-chapter ${styles.section}`} aria-labelledby="three-goals-title" data-testid="three-goals-compare">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">Oktober 2026 · drei Ziele</p>
        <h2 id="three-goals-title" className="v4-chapter-h2">
          Dieselbe Flotte, drei Fahrweisen — Spitze nach Speicher
        </h2>
        <p className="v4-subline">{summary}</p>
      </div>

      <figure className={`v4-content ${styles.figure}`}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Vergleich der Monats-Restlastspitze je Faktor und Fahrweise"
        >
          <text x={8} y={plotTop + plotH / 2} className={styles.yLabel} transform={`rotate(-90 8 ${plotTop + plotH / 2})`}>
            GW
          </text>
          <line x1={40} y1={refY} x2={width - 8} y2={refY} className={styles.refLine} />
          <text x={width - 10} y={refY - 4} className={styles.refLabel} textAnchor="end">
            Referenz {fmtGw(model.refPeakGw)}
          </text>
          {NATIONAL_FLEET_FACTORS.map((factor, gi) => {
            const gx = 44 + gi * (barGroupW + 12);
            return (
              <g key={factor}>
                <text x={gx + barGroupW / 2} y={height - 8} className={styles.xLabel} textAnchor="middle">
                  ×{factor}
                </text>
                {STRATEGY_ORDER.map((strategy, si) => {
                  const row = model.rows.find((r) => r.strategy === strategy)!;
                  const cell = row.cells.find((c) => c.factor === factor)!;
                  const bx = gx + si * (barW + gap);
                  const top = y(cell.peakAfterGw);
                  const h = plotTop + plotH - top;
                  const href = fleetMonatHref(monthKey, factor, strategy);
                  const active = factor === activeFactor && strategy === activeStrategy;
                  return (
                    <a
                      key={strategy}
                      href={href}
                      className={styles.barLink}
                      aria-label={`${NATIONAL_FLEET_STRATEGY_UI[strategy].shortDe}, ×${factor}, ${fmtGw(cell.peakAfterGw)} GW`}
                    >
                      <rect
                        x={bx}
                        y={top}
                        width={barW}
                        height={Math.max(2, h)}
                        className={`${styles.bar} ${STRATEGY_CLASS[strategy]}${active ? ` ${styles.barActive}` : ""}`}
                        rx={2}
                      />
                    </a>
                  );
                })}
              </g>
            );
          })}
        </svg>
        <figcaption className={styles.caption}>
          <ul className={styles.legend}>
            {STRATEGY_ORDER.map((id) => (
              <li key={id}>
                <span className={`${styles.swatch} ${STRATEGY_CLASS[id]}`} aria-hidden="true" />
                {NATIONAL_FLEET_STRATEGY_UI[id].shortDe}
              </li>
            ))}
          </ul>
          <p className="v4-footnote num">
            Netzseitige Ladung je Zelle:{" "}
            {model.rows
              .map((row) => `${row.shortLabel} ×1 ${fmtGw(row.cells.find((c) => c.factor === 1)!.chargeGwh)} GWh`)
              .join(" · ")}
            .{" "}
            <Link href="/methodik#insight-drei-ziele" className="v4-footnote-link">
              Methodik
            </Link>
          </p>
          {marktPeakFootnote ? <p className={`v4-footnote muted ${styles.warnNote}`}>{marktPeakFootnote}</p> : null}
        </figcaption>
        <table className={`${styles.table} num sr-only-focusable`}>
          <caption>Spitze nach Speicher (GW) und Ladung (GWh)</caption>
          <thead>
            <tr>
              <th scope="col">Fahrweise</th>
              {NATIONAL_FLEET_FACTORS.map((f) => (
                <th key={f} scope="col">
                  ×{f} GW / GWh
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.rows.map((row) => (
              <tr key={row.strategy}>
                <th scope="row">{row.shortLabel}</th>
                {row.cells.map((c) => (
                  <td key={c.factor}>
                    {fmtGw(c.peakAfterGw)} GW · {fmtGw(c.chargeGwh)} GWh
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </section>
  );
}
