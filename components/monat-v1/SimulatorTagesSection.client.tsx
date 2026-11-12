"use client";

import Link from "next/link";

import styles from "@/components/monat-v1/monat-v1.module.css";
import simStyles from "@/components/monat-v1/simulator-fahrweisen.module.css";
import { useLayoutWide, useSimulatorTheme } from "@/components/monat-v1/useSimulatorTheme";
import type { SimulatorFahrweisenData, SimulatorTagesklasse } from "@/lib/simulatorFahrweisenTypes";
import { formatGw } from "@/lib/simulatorFahrweisenTypes";
import { MONAT_V1_GRAPH_CAPTION } from "@/lib/monatV1Format";

function klasseColor(klasse: string, colors: ReturnType<typeof import("@/components/monat-v1/simulatorPalette").simulatorPalette>) {
  switch (klasse) {
    case "win_win":
      return colors.winWin;
    case "konflikt_schwach":
      return colors.konfliktSchwach;
    case "konflikt_hebung":
      return colors.konfliktHebung;
    default:
      return colors.neutral;
  }
}

export function SimulatorTagesSection({ data }: { data: SimulatorFahrweisenData }) {
  const wide = useLayoutWide(1100);
  const { colors } = useSimulatorTheme();
  const vb = wide ? { w: 1152, h: 200, L: 16, R: 16, T: 24, B: 40 } : { w: 350, h: 250, L: 16, R: 16, T: 20, B: 44 };
  const plotW = vb.w - vb.L - vb.R;
  const plotH = vb.h - vb.T - vb.B;
  const days = data.tagesklassen;
  const barW = plotW / days.length;
  const maxRaise = Math.max(...days.filter((d) => d.marketRaisesPeak).map((d) => Math.abs(d.marketReductionGw)), 0.01);

  return (
    <section className={styles.section} aria-labelledby="sim-g2-title" data-testid="simulator-tagesstreifen">
      <p className={styles.eyebrow}>Tageshorizont · Regel T · nicht die Monatsscheibe</p>
      <h2 id="sim-g2-title" className={styles.h2}>
        An keinem Tag erreicht der Markt 70 Prozent.
      </h2>
      <p className={styles.lead}>
        {data.tagesklassenSummary.winWin} Win-win-Tage · Maximum{" "}
        {Math.round(data.tagesklassenSummary.maxShare * 100)} % am{" "}
        {data.tagesklassenSummary.maxShareDate.slice(8, 10)}.{data.tagesklassenSummary.maxShareDate.slice(5, 7)}. · Der
        29.10. (Monatsspitze) erreicht 10 % bei höchstem Tageserlös (2,11 Mio. €, Modellschätzung).
      </p>
      <div className={styles.legend} aria-hidden="true">
        <span className={styles.legendItem}>
          <span className={styles.dotFilled} style={{ background: colors.winWin }} /> Win-win (0)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dotHollow} style={{ borderColor: colors.neutral, background: colors.neutral }} /> Neutral (
          {data.tagesklassenSummary.neutral})
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dotRust} style={{ background: colors.konfliktSchwach }} /> Konflikt-schwach (
          {data.tagesklassenSummary.konfliktSchwach})
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dotRust} /> Konflikt-Hebung ({data.tagesklassenSummary.konfliktHebung})
        </span>
      </div>
      <div className={simStyles.stripeWrap}>
        <svg viewBox={`0 0 ${vb.w} ${vb.h}`} className={styles.svg} role="img" aria-labelledby="sim-g2-desc">
          <title id="sim-g2-desc">31 Oktober-Tage nach Regel T</title>
          <line x1={vb.L} x2={vb.L + plotW} y1={vb.T + plotH / 2} y2={vb.T + plotH / 2} stroke={colors.muted} strokeWidth={1} />
          <line
            x1={vb.L}
            x2={vb.L + plotW}
            y1={vb.T + plotH * 0.3}
            y2={vb.T + plotH * 0.3}
            stroke={colors.muted}
            strokeWidth={1}
            strokeDasharray="5 4"
          />
          <line
            x1={vb.L}
            x2={vb.L + plotW}
            y1={vb.T + plotH * 0.7}
            y2={vb.T + plotH * 0.7}
            stroke={colors.muted}
            strokeWidth={1}
            strokeDasharray="5 4"
          />
          <text x={vb.L + plotW} y={vb.T + plotH * 0.3 - 4} textAnchor="end" fill={colors.muted} fontSize="12">
            70 %
          </text>
          <text x={vb.L + plotW} y={vb.T + plotH * 0.7 + 14} textAnchor="end" fill={colors.muted} fontSize="12">
            30 %
          </text>
          {days.map((d, i) => renderBar(d, i, barW, vb, plotH, colors, maxRaise))}
        </svg>
      </div>
      <p className={styles.figcaption}>{MONAT_V1_GRAPH_CAPTION}</p>
      <div className={simStyles.dayLinks}>
        <Link href="/tag/2026-10-21" className={simStyles.dayLink}>
          21.10. — Markt lädt mittags (55,60 GW neue Tagesspitze)
        </Link>
        <Link href="/tag/2026-10-29" className={simStyles.dayLink}>
          29.10. — Preis eine Stunde vor Restlastspitze (64,41 GW)
        </Link>
      </div>
    </section>
  );
}

function renderBar(
  d: SimulatorTagesklasse,
  i: number,
  barW: number,
  vb: { L: number; T: number },
  plotH: number,
  colors: ReturnType<typeof import("@/components/monat-v1/simulatorPalette").simulatorPalette>,
  maxRaise: number,
) {
  const x = vb.L + i * barW + 1;
  const w = Math.max(2, barW - 2);
  const mid = vb.T + plotH / 2;
  const share = Math.min(1, Math.max(-0.4, d.shareOfNetzReduction));
  const h = (Math.abs(share) / 1) * (plotH / 2 - 8);
  const y = share >= 0 ? mid - h : mid;
  const fill = klasseColor(d.klasse, colors);
  const dayNum = Number(d.date.slice(8, 10));
  return (
    <g key={d.date}>
      <rect x={x} y={y} width={w} height={Math.max(2, h)} fill={fill} opacity={d.marketRaisesPeak ? 1 : 0.85} />
      {[1, 6, 10, 15, 21, 25, 31].includes(dayNum) ? (
        <text x={x + w / 2} y={vb.T + plotH + 16} textAnchor="middle" fill={colors.muted} fontSize="10">
          {String(dayNum).padStart(2, "0")}
        </text>
      ) : null}
      {d.date === "2026-10-06" ? (
        <text x={x + w / 2} y={vb.T - 4} textAnchor="middle" fill={colors.ink} fontSize="10">
          46 %
        </text>
      ) : null}
      {d.date === "2026-10-21" && d.marketRaisesPeak ? (
        <text x={x + w / 2} y={mid + h + 14} textAnchor="middle" fill={colors.rust} fontSize="10">
          hebt {formatGw(Math.abs(d.marketReductionGw))}
        </text>
      ) : null}
    </g>
  );
}
