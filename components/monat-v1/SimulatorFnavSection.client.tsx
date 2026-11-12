"use client";

import styles from "@/components/monat-v1/monat-v1.module.css";
import simStyles from "@/components/monat-v1/simulator-fahrweisen.module.css";
import { useLayoutWide, useSimulatorTheme } from "@/components/monat-v1/useSimulatorTheme";
import type { SimulatorFahrweisenData } from "@/lib/simulatorFahrweisenTypes";
import { formatGw, formatMioEur, pctOfMarket } from "@/lib/simulatorFahrweisenTypes";
import { MONAT_V1_GRAPH_CAPTION } from "@/lib/monatV1Format";

export function SimulatorFnavSection({ data }: { data: SimulatorFahrweisenData }) {
  const wide = useLayoutWide(1100);
  const { colors } = useSimulatorTheme();
  const { endpoints, kipppunkt } = data;
  const mkt = endpoints.marketLex;

  return (
    <section className={styles.section} aria-labelledby="sim-g4-title" data-testid="simulator-fnav">
      <p className={styles.eyebrow}>Vertragsform · stilisiert · national</p>
      <h2 id="sim-g4-title" className={styles.h2}>
        Was wirkt, ist ein Leistungsdeckel — nicht das Abendfenster.
      </h2>
      <p className={styles.lead}>
        fNAV-Zeitfenster 16–21 Uhr landet am Markt-Ende (0,37 GW). Der Leistungsdeckel 62 GW entspricht dem ε-Schnitt
        (2,41 GW Senkung).
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
          <h3>Leistungsdeckel 62 GW</h3>
          <p>
            {formatMioEur(endpoints.cap62Gw.revenueMioEur)} · {pctOfMarket(endpoints.cap62Gw.revenueMioEur, mkt.revenueMioEur)} ·
            Senkung {formatGw(endpoints.cap62Gw.reductionGw)}
          </p>
          <p>Der ε-Schnitt — Vertragsform.</p>
        </article>
        <article className={simStyles.fnavCard}>
          <h3>Deckel 64,41 GW</h3>
          <p>
            Bei ×2 unverändert ({formatGw(endpoints.capBaselineGw.reductionGw)}). Begrenzt höhere Faktoren auf 64,41 GW.
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
  colors: ReturnType<typeof import("@/components/monat-v1/simulatorPalette").simulatorPalette>;
}) {
  const vb = wide ? { w: 560, h: 340, L: 52, R: 24, T: 28, B: 48 } : { w: 350, h: 320, L: 52, R: 16, T: 24, B: 44 };
  const plotW = vb.w - vb.L - vb.R;
  const plotH = vb.h - vb.T - vb.B;
  const yMin = 40;
  const yMax = 100;
  const factors = [1, 2, 3, 3.9, 5, 10];
  const series = data.kipppunkt.factors;
  const markt = (f: number) => series.find((s) => Math.abs(s.factor - f) < 0.05)?.marketPeakGw ?? null;
  const netz = (f: number) => series.find((s) => Math.abs(s.factor - f) < 0.05)?.netzPeakGw ?? null;
  const fx = (f: number) => vb.L + ((f - 1) / 9) * plotW;
  const fy = (gw: number) => vb.T + plotH - ((gw - yMin) / (yMax - yMin)) * plotH;
  const ref = data.baselinePeakGw;
  const hatchFrom = fx(3.9);

  const marktPts = factors
    .map((f) => ({ f, gw: markt(f) }))
    .filter((p): p is { f: number; gw: number } => p.gw != null);
  const netzPts = factors
    .map((f) => ({ f, gw: netz(f) }))
    .filter((p): p is { f: number; gw: number } => p.gw != null);

  return (
    <svg viewBox={`0 0 ${vb.w} ${vb.h}`} className={styles.svg} role="img" aria-label="Kipppunkt neue Monatsspitze">
      <defs>
        <pattern id="hatch-sim-markt" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke={colors.rust} strokeWidth="1.25" />
        </pattern>
      </defs>
      {[40, 60, 64.41, 80, 100].map((t) => (
        <g key={t}>
          <line x1={vb.L} x2={vb.L + plotW} y1={fy(t)} y2={fy(t)} stroke={colors.grid} strokeWidth={1} />
          <text x={vb.L - 8} y={fy(t) + 4} textAnchor="end" fill={colors.muted} fontSize="12">
            {t === 64.41 ? "64,41" : t}
          </text>
        </g>
      ))}
      <line
        x1={vb.L}
        x2={vb.L + plotW}
        y1={fy(ref)}
        y2={fy(ref)}
        stroke={colors.muted}
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      <polyline
        points={netzPts.map((p) => `${fx(p.f)},${fy(p.gw)}`).join(" ")}
        fill="none"
        stroke={colors.ink}
        strokeWidth={2.5}
      />
      <polyline
        points={marktPts
          .filter((p) => p.f <= 3.8)
          .map((p) => `${fx(p.f)},${fy(p.gw)}`)
          .join(" ")}
        fill="none"
        stroke={colors.rust}
        strokeWidth={2.25}
      />
      <polyline
        points={marktPts
          .filter((p) => p.f >= 3.9)
          .map((p) => `${fx(p.f)},${fy(p.gw)}`)
          .join(" ")}
        fill="none"
        stroke={colors.rust}
        strokeWidth={2.25}
        strokeDasharray="7 5"
      />
      <rect x={hatchFrom} y={vb.T} width={vb.L + plotW - hatchFrom} height={plotH} fill="url(#hatch-sim-markt)" opacity={0.35} />
      {factors.map((f) => (
        <text key={f} x={fx(f)} y={vb.h - 16} textAnchor="middle" fill={colors.muted} fontSize="12">
          ×{String(f).replace(".", ",")}
        </text>
      ))}
      <text x={vb.L + 6} y={fy(ref) - 8} fill={colors.muted} fontSize="12">
        beobachtet 64,41
      </text>
      <text x={fx(3.9) + 8} y={fy(80)} fill={colors.ink} fontSize="12">
        neue Spitze ab ×3,9
      </text>
    </svg>
  );
}
