"use client";

import styles from "@/components/monat-v1/monat-v1.module.css";
import simStyles from "@/components/monat-v1/simulator-fahrweisen.module.css";
import type { SimulatorPalette } from "@/components/monat-v1/simulatorPalette";
import { HatchDefs, SvgText } from "@/components/monat-v1/simulatorSvg";
import { useLayoutWide, useSimulatorTheme } from "@/components/monat-v1/useSimulatorTheme";
import { formatDec, mapX, mapY } from "@/lib/simulatorFahrweisenDerived";
import type { SimulatorFahrweisenData } from "@/lib/simulatorFahrweisenTypes";
import { formatGw, formatMioEur, pctOfMarket } from "@/lib/simulatorFahrweisenTypes";
import { MONAT_V1_GRAPH_CAPTION } from "@/lib/monatV1Format";

export function SimulatorFnavSection({ data }: { data: SimulatorFahrweisenData }) {
  const wide = useLayoutWide(1100);
  const { colors } = useSimulatorTheme();
  const { endpoints } = data;
  const mkt = endpoints.marketLex;

  return (
    <section className={styles.section} aria-labelledby="sim-g4-title" data-testid="simulator-fnav">
      <p className={styles.eyebrow}>Vertragsform · stilisiert · national</p>
      <h2 id="sim-g4-title" className={styles.h2}>
        Was wirkt, ist ein Leistungsdeckel — nicht das Abendfenster.
      </h2>
      <p className={styles.lead}>
        fNAV-Zeitfenster 16–21 Uhr landet am Markt-Ende ({formatGw(endpoints.fnavTimeWindow.reductionGw)}). Der
        Leistungsdeckel 62{"\u00A0"}GW entspricht dem ε-Schnitt ({formatGw(endpoints.cap62Gw.reductionGw)} Senkung).
      </p>
      <div className={simStyles.fnavGrid}>
        <article className={simStyles.fnavCard}>
          <h3>Zeitfenster 16–21 Uhr</h3>
          <p>
            {formatMioEur(endpoints.fnavTimeWindow.revenueMioEur)} · Senkung {formatGw(endpoints.fnavTimeWindow.reductionGw)}
          </p>
          <p>Identisch mit Max. Erlös — wirkt nicht gegen Mittagsladen.</p>
        </article>
        <article className={simStyles.fnavCard}>
          <h3>Leistungsdeckel 62{"\u00A0"}GW</h3>
          <p>
            {formatMioEur(endpoints.cap62Gw.revenueMioEur)} · {pctOfMarket(endpoints.cap62Gw.revenueMioEur, mkt.revenueMioEur)}{" "}
            · Senkung {formatGw(endpoints.cap62Gw.reductionGw)}
          </p>
          <p>Der ε-Schnitt — Vertragsform.</p>
        </article>
        <article className={simStyles.fnavCard}>
          <h3>Deckel 64,41{"\u00A0"}GW</h3>
          <p>
            Bei ×2 unverändert ({formatGw(endpoints.capBaselineGw.reductionGw)}). Begrenzt höhere Faktoren auf{" "}
            {formatGw(data.baselinePeakGw)}.
          </p>
        </article>
      </div>
      <div className={styles.chartWrap}>
        <KipppunktChart data={data} wide={wide} colors={colors} />
      </div>
      <p className={styles.figcaption}>
        {MONAT_V1_GRAPH_CAPTION} · Preisnehmer, keine Euro-Zahl für ×5/×10 ab Kipppunkt.
      </p>
    </section>
  );
}

function KipppunktChart({
  data,
  wide,
  colors,
}: {
  data: SimulatorFahrweisenData;
  wide: boolean;
  colors: SimulatorPalette;
}) {
  const vb = wide ? { w: 560, h: 340, L: 52, R: 28, T: 32, B: 50 } : { w: 350, h: 320, L: 52, R: 16, T: 28, B: 50 };
  const plotW = vb.w - vb.L - vb.R;
  const plotH = vb.h - vb.T - vb.B;
  const yMin = 40;
  const yMax = 100;
  const series = data.kipppunkt.factors;
  const marktAt = (f: number) => series.find((s) => Math.abs(s.factor - f) < 0.05)?.marketPeakGw ?? null;
  const netzAt = (f: number) => series.find((s) => Math.abs(s.factor - f) < 0.05)?.netzPeakGw ?? null;
  const fx = (f: number) => mapX(f, 1, 10, plotW, vb.L);
  const fy = (gw: number) => mapY(gw, yMin, yMax, plotH, vb.T);
  const ref = data.baselinePeakGw;
  const m10 = marktAt(10)!;
  const n10 = netzAt(10)!;
  const m39 = marktAt(3.9)!;
  const xticks = [1, 2, 3, 5, 10];
  const yticks = wide ? [40, 50, 60, 70, 80, 90, 100] : [40, 60, 80, 100];
  const marktPts = [...series].sort((a, b) => a.factor - b.factor);
  const netzPts = marktPts.filter((p) => netzAt(p.factor) != null);
  const pre = marktPts.filter((p) => p.factor <= 3.8 + 1e-9);
  const post = marktPts.filter((p) => p.factor >= 3.8 - 1e-9);
  const hatchPts = [
    `${fx(3.9)},${fy(ref)}`,
    ...marktPts.filter((p) => p.factor >= 3.9 - 1e-9).map((p) => `${fx(p.factor)},${fy(p.marketPeakGw)}`),
    `${fx(10)},${fy(ref)}`,
  ].join(" ");

  return (
    <svg
      viewBox={`0 0 ${vb.w} ${vb.h}`}
      className={styles.svg}
      role="img"
      aria-label="Monatsspitze nach Flottengröße: neue Spitze ab mal 3,9 unter dem Markt-Fahrplan, Preisnehmer, keine Euro-Zahl"
      data-testid="simulator-g4-kipp"
    >
      <HatchDefs id="kipp" color={colors.rust} bg={colors.bg} />
      <rect x={vb.L} y={vb.T} width={plotW} height={plotH} fill={colors.flaeche} />
      {xticks.map((t) => (
        <g key={`kx${t}`}>
          <line x1={fx(t)} x2={fx(t)} y1={vb.T} y2={vb.T + plotH} stroke={colors.grid} strokeWidth={1} />
          <SvgText x={fx(t)} y={vb.T + plotH + 16} anchor="middle" fill={colors.muted}>
            ×{formatDec(t, 0)}
          </SvgText>
        </g>
      ))}
      <line x1={fx(3.9)} x2={fx(3.9)} y1={vb.T} y2={vb.T + plotH} stroke={colors.grid} strokeWidth={1} />
      <SvgText x={fx(3.9)} y={vb.T + plotH + 16} anchor="middle" fill={colors.ink} weight={500}>
        ×3,9
      </SvgText>
      {yticks.map((t) => (
        <g key={`ky${t}`}>
          <line x1={vb.L} x2={vb.L + plotW} y1={fy(t)} y2={fy(t)} stroke={colors.grid} strokeWidth={1} />
          <SvgText x={vb.L - 8} y={fy(t) + 4} anchor="end" fill={colors.muted}>
            {formatDec(t, 0)}
          </SvgText>
        </g>
      ))}
      <SvgText x={vb.L - 8} y={fy(ref) + 4} anchor="end" fill={colors.ink} weight={500}>
        {formatDec(ref)}
      </SvgText>
      <line
        x1={vb.L}
        x2={vb.L + plotW}
        y1={fy(ref)}
        y2={fy(ref)}
        stroke={colors.muted}
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      <line x1={vb.L} x2={vb.L + plotW} y1={vb.T + plotH} y2={vb.T + plotH} stroke={colors.ink} strokeWidth={1.25} />
      <line x1={vb.L} y1={vb.T} x2={vb.L} y2={vb.T + plotH} stroke={colors.ink} strokeWidth={1.25} />
      <polygon points={hatchPts} fill="url(#hatch-kipp)" opacity={0.9} />
      <polyline
        points={netzPts.map((p) => `${fx(p.factor)},${fy(p.netzPeakGw)}`).join(" ")}
        fill="none"
        stroke={colors.ink}
        strokeWidth={2.5}
      />
      <polyline
        points={pre.map((p) => `${fx(p.factor)},${fy(p.marketPeakGw)}`).join(" ")}
        fill="none"
        stroke={colors.rust}
        strokeWidth={2.25}
      />
      <polyline
        points={post.map((p) => `${fx(p.factor)},${fy(p.marketPeakGw)}`).join(" ")}
        fill="none"
        stroke={colors.rust}
        strokeWidth={2.25}
        strokeDasharray="7 5"
      />
      <circle cx={fx(2)} cy={fy(marktAt(2)!)} r={4} fill={colors.rust} stroke={colors.flaeche} strokeWidth={1} />
      <circle cx={fx(3.9)} cy={fy(m39)} r={5} fill={colors.rust} stroke={colors.flaeche} strokeWidth={1.25} />
      <circle cx={fx(10)} cy={fy(m10)} r={5} fill={colors.rust} stroke={colors.flaeche} strokeWidth={1.25} />
      <circle cx={fx(2)} cy={fy(netzAt(2)!)} r={4} fill={colors.ink} stroke={colors.flaeche} strokeWidth={1} />
      <circle cx={fx(10)} cy={fy(n10)} r={5} fill={colors.ink} stroke={colors.flaeche} strokeWidth={1.25} />
      {wide ? (
        <>
          <SvgText x={fx(10) - 8} y={fy(m10) - 8} anchor="end" fill={colors.ink} weight={500}>
            Max. Erlös {formatGw(m10)}
          </SvgText>
          <SvgText x={fx(10) - 8} y={fy(n10) + 16} anchor="end" fill={colors.ink} weight={500}>
            Netzdienlich {formatGw(n10)}
          </SvgText>
          <SvgText x={fx(3.9) + 8} y={fy(m39) - 12} fill={colors.ink} weight={500}>
            neue Spitze ab{"\u00A0"}×3,9
          </SvgText>
          <SvgText x={fx(3.9) + 8} y={fy(m39) + 8} fill={colors.muted}>
            {formatGw(m39)} · 21.10. 14:00
          </SvgText>
          <SvgText x={vb.L + 8} y={fy(ref) - 8} fill={colors.muted}>
            beobachtet {formatDec(ref)}
          </SvgText>
          <SvgText x={vb.L + plotW} y={16} anchor="end" fill={colors.muted}>
            Preisnehmer
          </SvgText>
          <SvgText x={vb.L} y={16} fill={colors.ink} weight={500}>
            Kipppunkt · Monatsspitze, GW
          </SvgText>
        </>
      ) : (
        <>
          <SvgText x={fx(10) - 4} y={fy(m10) - 8} anchor="end" fill={colors.ink} weight={500}>
            Max. Erlös
          </SvgText>
          <SvgText x={fx(10) - 4} y={fy(m10) + 10} anchor="end" fill={colors.ink}>
            {formatGw(m10)}
          </SvgText>
          <SvgText x={fx(10) - 4} y={fy(n10) + 16} anchor="end" fill={colors.ink} weight={500}>
            Netzdienlich
          </SvgText>
          <SvgText x={fx(10) - 4} y={fy(n10) + 34} anchor="end" fill={colors.ink}>
            {formatGw(n10)}
          </SvgText>
          <SvgText x={fx(3.9) + 8} y={fy(80) + 4} fill={colors.ink} weight={500}>
            neue Spitze
          </SvgText>
          <SvgText x={fx(3.9) + 8} y={fy(80) + 22} fill={colors.ink}>
            ab{"\u00A0"}×3,9
          </SvgText>
          <SvgText x={vb.L + 6} y={fy(ref) - 10} fill={colors.muted}>
            {formatDec(ref)}
          </SvgText>
          <SvgText x={vb.L} y={16} fill={colors.ink} weight={500}>
            Monatsspitze, GW
          </SvgText>
        </>
      )}
      <SvgText x={(vb.L + vb.L + plotW) / 2} y={vb.h - 8} anchor="middle" fill={colors.muted}>
        Zusatzflotte, Konvention{"\u00A0"}(a)
      </SvgText>
    </svg>
  );
}
