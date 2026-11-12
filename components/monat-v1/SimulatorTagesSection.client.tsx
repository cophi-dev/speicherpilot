"use client";

import Link from "next/link";

import styles from "@/components/monat-v1/monat-v1.module.css";
import simStyles from "@/components/monat-v1/simulator-fahrweisen.module.css";
import type { SimulatorPalette } from "@/components/monat-v1/simulatorPalette";
import { Knockout, SvgText } from "@/components/monat-v1/simulatorSvg";
import { useLayoutWide, useSimulatorTheme } from "@/components/monat-v1/useSimulatorTheme";
import { deriveExampleDay } from "@/lib/simulatorFahrweisenDerived";
import type { SimulatorFahrweisenData } from "@/lib/simulatorFahrweisenTypes";
import { formatGw, formatMioEur } from "@/lib/simulatorFahrweisenTypes";
import { MONAT_V1_GRAPH_CAPTION } from "@/lib/monatV1Format";

function klasseColor(klasse: string, colors: SimulatorPalette) {
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
  const d21 = deriveExampleDay(data, "2026-10-21");
  const d29 = deriveExampleDay(data, "2026-10-29");
  const sum = data.tagesklassenSummary;
  const maxDay = sum.maxShareDate;
  const maxDayLabel = `${maxDay.slice(8, 10)}.${maxDay.slice(5, 7)}.`;
  const maxPct = Math.round(sum.maxShare * 100);
  const day29 = data.tagesklassen.find((d) => d.date === "2026-10-29");
  const share29 = day29 ? Math.round(day29.shareOfNetzReduction * 100) : 10;
  const rev29 = day29 ? day29.marketRevenueEur / 1_000_000 : 2.11;

  return (
    <section className={styles.section} aria-labelledby="sim-g2-title" data-testid="simulator-tagesstreifen">
      <p className={styles.eyebrow}>Tageshorizont · Regel T · nicht die Monatsscheibe</p>
      <h2 id="sim-g2-title" className={styles.h2}>
        An keinem Tag erreicht der Markt 70 Prozent.
      </h2>
      <p className={styles.lead}>
        {sum.winWin} Win-win-Tage · Maximum {maxPct}{"\u00A0"}% am {maxDayLabel} · Der 29.10. (Monatsspitze) erreicht{" "}
        {share29}{"\u00A0"}% bei höchstem Tageserlös ({formatMioEur(rev29)}, Modellschätzung).
      </p>
      <div className={styles.legend} aria-hidden="true">
        <span className={styles.legendItem}>
          <span className={styles.dotFilled} style={{ background: colors.winWin }} /> Win-win ({sum.winWin})
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dotHollow} style={{ borderColor: colors.neutral, background: colors.neutral }} />{" "}
          Neutral ({sum.neutral})
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dotRust} style={{ background: colors.konfliktSchwach }} /> Konflikt-schwach (
          {sum.konfliktSchwach})
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dotRust} style={{ background: colors.konfliktHebung }} /> Konflikt-Hebung (
          {sum.konfliktHebung})
        </span>
      </div>
      <div className={simStyles.stripeWrap}>
        <StripeChart data={data} wide={wide} colors={colors} maxPct={maxPct} share29={share29} />
      </div>
      <p className={styles.figcaption}>
        {MONAT_V1_GRAPH_CAPTION} · Tageshorizont, Regel T, SoC Start = Ende = 50{"\u00A0"}%, Zeitzone Europe/Berlin.
      </p>
      <div className={simStyles.dayLinks}>
        <Link href="/tag/2026-10-21" className={simStyles.dayLink}>
          21.10. — Markt lädt mittags ({formatGw(d21.marketPeakGw)} neue Tagesspitze)
        </Link>
        <Link href="/tag/2026-10-29" className={simStyles.dayLink}>
          29.10. — Preis eine Stunde vor Restlastspitze ({formatGw(d29.observedPeakGw)})
        </Link>
      </div>
    </section>
  );
}

function StripeChart({
  data,
  wide,
  colors,
  maxPct,
  share29,
}: {
  data: SimulatorFahrweisenData;
  wide: boolean;
  colors: SimulatorPalette;
  maxPct: number;
  share29: number;
}) {
  const vb = wide ? { w: 1152, h: 200, L: 16, R: 16, T: 48, B: 36 } : { w: 350, h: 250, L: 16, R: 16, T: 56, B: 28 };
  const plotW = vb.w - vb.L - vb.R;
  const days = data.tagesklassen;
  const n = days.length;
  const gap = wide ? 3 : 2;
  const bw = (plotW - (n - 1) * gap) / n;
  const barT = vb.T;
  const barH = wide ? 80 : 70;
  const y0Share = -0.6;
  const y1Share = 0.75;
  const sy = (share: number) => barT + ((y1Share - share) / (y1Share - y0Share)) * barH;
  const zeroY = sy(0);
  const p70 = sy(0.7);
  const p30 = sy(0.3);
  const day21 = days.find((d) => d.date === "2026-10-21");
  const hebung = day21 ? Math.abs(day21.marketReductionGw) : 0;
  const aria = `31 Oktobertage nach Regel T: ${data.tagesklassenSummary.winWin} Win-win, ${data.tagesklassenSummary.neutral} neutral, ${data.tagesklassenSummary.konfliktSchwach} Konflikt-schwach, ${data.tagesklassenSummary.konfliktHebung} Konflikt-Hebung`;

  return (
    <svg viewBox={`0 0 ${vb.w} ${vb.h}`} className={styles.svg} role="img" aria-label={aria} data-testid="simulator-g2">
      <line x1={vb.L} x2={vb.L + plotW} y1={p70} y2={p70} stroke={colors.winWin} strokeWidth={1} strokeDasharray="4 3" />
      <line
        x1={vb.L}
        x2={vb.L + plotW}
        y1={p30}
        y2={p30}
        stroke={colors.konfliktSchwach}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <line x1={vb.L} x2={vb.L + plotW} y1={zeroY} y2={zeroY} stroke={colors.ink} strokeWidth={1} />
      <SvgText x={vb.L + plotW} y={p70 - 4} anchor="end" fill={colors.ink} weight={500}>
        70{"\u00A0"}%
      </SvgText>
      <SvgText x={vb.L + plotW} y={p30 + 14} anchor="end" fill={colors.muted}>
        30{"\u00A0"}%
      </SvgText>
      {days.map((d, i) => {
        const x = vb.L + i * (bw + gap);
        const share = d.shareOfNetzReduction;
        const yTop = sy(Math.max(share, 0));
        const yBot = sy(Math.min(share, 0));
        const fill = klasseColor(d.klasse, colors);
        const dayNum = Number(d.date.slice(8, 10));
        const showDay = [1, 6, 10, 15, 21, 25, 31].includes(dayNum) || (wide && dayNum % 2 === 1);
        // 29 entfällt mobil (steht in der Annotation)
        const showNum = showDay && !(dayNum === 29 && !wide);
        const anc: "start" | "middle" | "end" = dayNum === 1 ? "start" : dayNum === 31 ? "end" : "middle";
        const xx = dayNum === 1 ? x : dayNum === 31 ? x + bw : x + bw / 2;
        return (
          <g key={d.date}>
            {share >= 0 ? (
              <rect x={x} y={yTop} width={bw} height={Math.max(2, zeroY - yTop)} fill={fill} />
            ) : (
              <rect x={x} y={zeroY} width={bw} height={Math.max(2, yBot - zeroY)} fill={fill} />
            )}
            {showNum ? (
              <SvgText x={xx} y={zeroY + 16} anchor={anc} fill={colors.muted}>
                {String(dayNum).padStart(2, "0")}.
              </SvgText>
            ) : null}
            {d.date === "2026-10-06" ? (
              <g>
                <Knockout x={x + bw / 2 - 70} y={yTop - 28} width={140} height={16} fill={colors.bg} opacity={0.9} />
                <SvgText x={x + bw / 2} y={yTop - 16} anchor="middle" fill={colors.ink} weight={500}>
                  06.10. {maxPct}{"\u00A0"}%
                </SvgText>
              </g>
            ) : null}
            {d.date === "2026-10-03" && wide ? (
              <SvgText x={x + bw / 2} y={yTop - 16} anchor="middle" fill={colors.ink} weight={500}>
                {Math.round(d.shareOfNetzReduction * 100)}{"\u00A0"}%
              </SvgText>
            ) : null}
            {d.date === "2026-10-21" && d.marketRaisesPeak ? (
              <g>
                <Knockout
                  x={x + bw / 2 - 80}
                  y={zeroY + 38}
                  width={160}
                  height={16}
                  fill={colors.bg}
                  opacity={0.9}
                />
                <SvgText x={x + bw / 2} y={zeroY + 50} anchor="middle" fill={colors.ink} weight={500}>
                  21.10. hebt {formatGw(hebung)}
                </SvgText>
              </g>
            ) : null}
            {d.date === "2026-10-29" ? (
              wide ? (
                <SvgText
                  x={Math.min(x + bw / 2, vb.w - 8)}
                  y={yTop - 16}
                  anchor={x + bw / 2 > vb.w - 200 ? "end" : "middle"}
                  fill={colors.ink}
                  weight={500}
                >
                  29.10. {share29}{"\u00A0"}% · Monatsspitze
                </SvgText>
              ) : (
                <g>
                  <Knockout x={vb.w - vb.R - 164} y={4} width={164} height={16} fill={colors.bg} opacity={0.9} />
                  <SvgText x={vb.w - vb.R} y={16} anchor="end" fill={colors.ink} weight={500}>
                    29.10. {share29}{"\u00A0"}%
                  </SvgText>
                </g>
              )
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
