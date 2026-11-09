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
import type { ThreeGoalsCompareModel } from "@/lib/nationalFleetThreeGoals";

const STRATEGY_ORDER: NationalFleetStrategyUi[] = ["ueberschuss", "spitze", "markt"];

const VIEW_W = 400;
const VIEW_H = 196;
const PAD_L = 44;
const PAD_R = 8;
const PAD_T = 30;
const PAD_B = 30;
const BAR_W = 10;
const BAR_GAP = 4;
const GROUP_GAP = 14;

function fmtGw(gw: number): string {
  return formatQuantity(gw, "de", 2);
}

function pickYTicks(maxGw: number): number[] {
  const top = Math.ceil(maxGw / 20) * 20;
  const mid = Math.round(top / 2);
  return [0, mid, top];
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
  const chartMax = Math.max(model.refPeakGw, ...peakValues, 1) * 1.04;
  const yTicks = pickYTicks(chartMax);
  const yScaleMax = yTicks[yTicks.length - 1];
  const plotW = VIEW_W - PAD_L - PAD_R;
  const plotH = VIEW_H - PAD_T - PAD_B;

  const y = (gw: number) => PAD_T + plotH - (gw / yScaleMax) * plotH;
  const refY = y(model.refPeakGw);

  const groupCount = NATIONAL_FLEET_FACTORS.length;
  const barsPerGroup = STRATEGY_ORDER.length;
  const groupInnerW = barsPerGroup * BAR_W + (barsPerGroup - 1) * BAR_GAP;
  const totalGroupsW = groupCount * groupInnerW + (groupCount - 1) * GROUP_GAP;
  const groupStartX = PAD_L + Math.max(0, (plotW - totalGroupsW) / 2);

  const ueX1 = model.rows.find((r) => r.strategy === "ueberschuss")!.cells.find((c) => c.factor === 1)!;
  const spX1 = model.rows.find((r) => r.strategy === "spitze")!.cells.find((c) => c.factor === 1)!;
  const mkX1 = model.rows.find((r) => r.strategy === "markt")!.cells.find((c) => c.factor === 1)!;

  return (
    <section
      className={`v4-chapter ${styles.section}`}
      aria-labelledby="three-goals-title"
      data-testid="three-goals-compare"
    >
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">Oktober 2026 · drei Ziele</p>
        <h2 id="three-goals-title" className="v4-chapter-h2">
          Dieselbe Flotte, drei Fahrweisen — Spitze nach Speicher
        </h2>
        <p className={`v4-subline ${styles.lead}`}>Oktober · Flotte 4,58 GW / 8 GWh · ×1</p>
      </div>

      <figure className={`v4-content ${styles.figure}`}>
        <div className={styles.chartShell}>
          <svg
            className={styles.svg}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            role="img"
            aria-label="Vergleich der Monats-Restlastspitze je Faktor und Fahrweise"
            preserveAspectRatio="xMidYMid meet"
          >
            {yTicks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD_L}
                  x2={VIEW_W - PAD_R}
                  y1={y(tick)}
                  y2={y(tick)}
                  className={styles.gridLine}
                />
                <text x={PAD_L - 6} y={y(tick) + 4} className={styles.yTick} textAnchor="end">
                  {tick}
                </text>
              </g>
            ))}
            <text x={PAD_L - 6} y={PAD_T - 10} className={styles.yUnit} textAnchor="end">
              GW
            </text>
            <line x1={PAD_L} y1={refY} x2={VIEW_W - PAD_R} y2={refY} className={styles.refLine} />
            <text x={PAD_L + 4} y={refY - 6} className={styles.refLabel}>
              Referenz {fmtGw(model.refPeakGw)}
            </text>
            {NATIONAL_FLEET_FACTORS.map((factor, gi) => {
              const gx = groupStartX + gi * (groupInnerW + GROUP_GAP);
              return (
                <g key={factor}>
                  <text x={gx + groupInnerW / 2} y={VIEW_H - 6} className={styles.xLabel} textAnchor="middle">
                    ×{factor}
                  </text>
                  {STRATEGY_ORDER.map((strategy, si) => {
                    const row = model.rows.find((r) => r.strategy === strategy)!;
                    const cell = row.cells.find((c) => c.factor === factor)!;
                    const bx = gx + si * (BAR_W + BAR_GAP);
                    const top = y(cell.peakAfterGw);
                    const h = PAD_T + plotH - top;
                    const href = fleetMonatHref(monthKey, factor, strategy);
                    const isActiveStrategy = strategy === activeStrategy;
                    const isActiveCell = factor === activeFactor && strategy === activeStrategy;
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
                          width={BAR_W}
                          height={Math.max(2, h)}
                          className={`${styles.bar} ${isActiveStrategy ? styles.barAccent : styles.barMuted}${
                            isActiveCell ? ` ${styles.barActive}` : ""
                          }`}
                          rx={2}
                        />
                      </a>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>
        <figcaption className={styles.caption}>
          <dl className={`${styles.kpiDl} num`}>
            <div>
              <dt>{NATIONAL_FLEET_STRATEGY_UI.ueberschuss.shortDe}</dt>
              <dd>
                Spitze {fmtGw(ueX1.peakAfterGw)} GW · Ladung {fmtGw(ueX1.chargeGwh)} GWh
              </dd>
            </div>
            <div>
              <dt>{NATIONAL_FLEET_STRATEGY_UI.spitze.shortDe}</dt>
              <dd>
                Spitze {fmtGw(spX1.peakAfterGw)} GW · Ladung {fmtGw(spX1.chargeGwh)} GWh
              </dd>
            </div>
            <div>
              <dt>{NATIONAL_FLEET_STRATEGY_UI.markt.shortDe}</dt>
              <dd>
                Spitze {fmtGw(mkX1.peakAfterGw)} GW · Ladung {fmtGw(mkX1.chargeGwh)} GWh
              </dd>
            </div>
          </dl>
          <p className={`${styles.legend} num`}>
            {STRATEGY_ORDER.map((id) => (
              <span key={id} className={styles.legendItem}>
                <span
                  className={`${styles.swatch} ${id === activeStrategy ? styles.swatchAccent : styles.swatchMuted}`}
                  aria-hidden="true"
                />
                {NATIONAL_FLEET_STRATEGY_UI[id].shortDe}
              </span>
            ))}
          </p>
          <p className="v4-footnote num">
            <Link href="/methodik#insight-drei-ziele" className="v4-footnote-link">
              Methodik
            </Link>
          </p>
          {marktPeakFootnote ? (
            <p className={`v4-footnote muted ${styles.warnNote}`}>{marktPeakFootnote}</p>
          ) : null}
        </figcaption>
        <table className={`${styles.table} num sr-only`}>
          <caption>Spitze nach Speicher (GW) und Ladung (GWh)</caption>
          <thead>
            <tr>
              <th scope="col">Fahrweise</th>
              {NATIONAL_FLEET_FACTORS.map((f) => (
                <th key={f} scope="col">
                  ×{f}
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
