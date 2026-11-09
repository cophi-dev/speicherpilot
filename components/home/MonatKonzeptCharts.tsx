"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/home/monat-konzept.module.css";
import { NationalFleetTimeSeriesChart } from "@/components/home/NationalFleetTimeSeriesChart";
import { formatQuantity } from "@/lib/formatQuantity";
import type { ArbeitWirkungModel, ArbeitWirkungPoint } from "@/lib/monatKonzeptA";
import { arbeitWirkungHref, formatKonzeptPeakInstant, logTickGwh } from "@/lib/monatKonzeptA";
import type { DauerlinieModel } from "@/lib/monatKonzeptC";
import { morphX } from "@/lib/monatKonzeptC";
import {
  NATIONAL_FLEET_FACTORS,
  NATIONAL_FLEET_STRATEGY_UI,
  type NationalFleetFactor,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";

const STRATEGIES: NationalFleetStrategyUi[] = ["spitze", "ueberschuss", "markt"];
const VIEW_W = 720;
const VIEW_H_A = 280;
const PAD_L = 52;
const PAD_R = 20;
const PAD_T = 24;
const PAD_B = 40;

function logX(chargeGwh: number, plotW: number): number {
  const minL = Math.log10(10);
  const maxL = Math.log10(10000);
  const v = Math.max(10, chargeGwh);
  const log = Math.log10(v);
  return PAD_L + ((log - minL) / (maxL - minL)) * plotW;
}

function yWirkung(gw: number, yMin: number, yMax: number, plotH: number): number {
  return PAD_T + plotH - ((gw - yMin) / (yMax - yMin)) * plotH;
}

function pointsForStrategy(model: ArbeitWirkungModel, strategy: NationalFleetStrategyUi): ArbeitWirkungPoint[] {
  return NATIONAL_FLEET_FACTORS.map(
    (f) => model.points.find((p) => p.strategy === strategy && p.factor === f)!,
  );
}

export function MonatArbeitWirkungChart({
  model,
  monthKey,
  activeFactor,
  activeStrategy,
  marktX10Detail,
}: {
  model: ArbeitWirkungModel;
  monthKey: string;
  activeFactor: NationalFleetFactor;
  activeStrategy: NationalFleetStrategyUi;
  marktX10Detail?: { residualGw: number; chargeGw: number; priceEurMwh: number } | null;
}) {
  const router = useRouter();
  const plotW = VIEW_W - PAD_L - PAD_R;
  const plotH = VIEW_H_A - PAD_T - PAD_B;
  const yMin = -35;
  const yMax = 16;
  const yZero = yWirkung(0, yMin, yMax, plotH);
  const poolX = logX(model.surplusPoolGwh, plotW);

  const navigate = useCallback(
    (factor: NationalFleetFactor, strategy: NationalFleetStrategyUi) => {
      router.push(arbeitWirkungHref(monthKey, factor, strategy), { scroll: false });
    },
    [monthKey, router],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const strategies = STRATEGIES;
      const idxS = strategies.indexOf(activeStrategy);
      const idxF = NATIONAL_FLEET_FACTORS.indexOf(activeFactor);
      if (e.key === "ArrowRight" && idxF < NATIONAL_FLEET_FACTORS.length - 1) {
        e.preventDefault();
        navigate(NATIONAL_FLEET_FACTORS[idxF + 1], activeStrategy);
      } else if (e.key === "ArrowLeft" && idxF > 0) {
        e.preventDefault();
        navigate(NATIONAL_FLEET_FACTORS[idxF - 1], activeStrategy);
      } else if (e.key === "ArrowDown" && idxS < strategies.length - 1) {
        e.preventDefault();
        navigate(activeFactor, strategies[idxS + 1]);
      } else if (e.key === "ArrowUp" && idxS > 0) {
        e.preventDefault();
        navigate(activeFactor, strategies[idxS - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeFactor, activeStrategy, navigate]);

  const renderPoint = (p: ArbeitWirkungPoint, hollow: boolean) => {
    const cx = logX(p.chargeGwh, plotW);
    const cy = yWirkung(p.wirkungGw, yMin, yMax, plotH);
    const active = p.factor === activeFactor && p.strategy === activeStrategy;
    return (
      <g key={`${p.strategy}-${p.factor}`}>
        <a
          href={arbeitWirkungHref(monthKey, p.factor, p.strategy)}
          className={`${styles.pointDot} ${styles[p.strategy]}${hollow ? ` ${styles.hollow}` : ""}${active ? ` ${styles.isActive}` : ""}`}
          aria-label={`${NATIONAL_FLEET_STRATEGY_UI[p.strategy].shortDe}, ×${p.factor}`}
          aria-current={active ? "true" : undefined}
        >
          <circle cx={cx} cy={cy} r={hollow ? 5 : 6} />
        </a>
      </g>
    );
  };

  return (
    <section className={`v4-chapter v4-content ${styles.sectionA}`} aria-labelledby="monat-arbeit-wirkung-title">
      <h2 id="monat-arbeit-wirkung-title" className="v4-chapter-h2">
        Arbeit gegen Wirkung
      </h2>
      <figure className={styles.figure}>
        <div className={`${styles.chartShell} ${styles.desktopChart}`}>
          <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H_A}`} className={styles.svg} role="img">
            <rect x={PAD_L} y={yZero} width={plotW} height={PAD_T + plotH - yZero} className={styles.negativeFill} />
            {[-30, -20, -10, 0, 10, 15].map((tick) => (
              <g key={tick}>
                <line x1={PAD_L} x2={VIEW_W - PAD_R} y1={yWirkung(tick, yMin, yMax, plotH)} y2={yWirkung(tick, yMin, yMax, plotH)} className={styles.gridLine} />
                <text x={PAD_L - 6} y={yWirkung(tick, yMin, yMax, plotH) + 4} className={styles.yTick} textAnchor="end">
                  {tick}
                </text>
              </g>
            ))}
            <text x={PAD_L - 6} y={PAD_T - 6} className={styles.yUnit} textAnchor="end">
              GW Δ
            </text>
            {logTickGwh(10000).map((tick) => (
              <g key={tick}>
                <line x1={logX(tick, plotW)} x2={logX(tick, plotW)} y1={PAD_T} y2={PAD_T + plotH} className={styles.gridLine} />
                <text x={logX(tick, plotW)} y={VIEW_H_A - 8} className={styles.xTick} textAnchor="middle">
                  {formatQuantity(tick, "de", tick >= 1000 ? 0 : 0)}
                </text>
              </g>
            ))}
            <text x={VIEW_W / 2} y={VIEW_H_A - 8} className={styles.xTick} textAnchor="middle">
              Netz-Ladung GWh (log)
            </text>
            <line x1={PAD_L} y1={yZero} x2={VIEW_W - PAD_R} y2={yZero} className={styles.zeroLine} />
            <line x1={poolX} y1={PAD_T} x2={poolX} y2={PAD_T + plotH} className={styles.poolLine} />
            <text x={poolX} y={PAD_T + 14} className={styles.annotationMuted} textAnchor="middle">
              Pool {formatQuantity(model.surplusPoolGwh, "de", 1)} GWh
            </text>
            {STRATEGIES.map((strategy) => {
              const pts = pointsForStrategy(model, strategy);
              const d = pts
                .map((p, i) => `${i === 0 ? "M" : "L"}${logX(p.chargeGwh, plotW)},${yWirkung(p.wirkungGw, yMin, yMax, plotH)}`)
                .join(" ");
              return <path key={strategy} d={d} className={`${styles.pathLine} ${styles[strategy]}`} />;
            })}
            {STRATEGIES.flatMap((strategy) => pointsForStrategy(model, strategy).map((p) => renderPoint(p, p.factor === 1)))}
            {model.marktX10 ? (
              <text x={logX(model.marktX10.chargeGwh, plotW) - 8} y={yWirkung(model.marktX10.wirkungGw, yMin, yMax, plotH) - 10} className={styles.annotation} textAnchor="end">
                {formatQuantity(model.marktX10.peakAfterGw, "de", 2)} GW
                {formatKonzeptPeakInstant(model.marktX10.peakTs) ? ` · ${formatKonzeptPeakInstant(model.marktX10.peakTs)}` : ""}
              </text>
            ) : null}
          </svg>
        </div>
        <div className={styles.mobilePaths}>
          {STRATEGIES.map((strategy) => (
            <div key={strategy}>
              <p className={styles.mobilePathTitle}>{NATIONAL_FLEET_STRATEGY_UI[strategy].shortDe}</p>
              <svg viewBox="0 0 320 72" className={styles.mobilePathChart}>
                {NATIONAL_FLEET_FACTORS.map((f, i) => {
                  const p = model.points.find((pt) => pt.strategy === strategy && pt.factor === f)!;
                  const x = 24 + i * 72;
                  const y = 60 - (p.wirkungGw + 35) * (50 / 50);
                  const active = p.factor === activeFactor && p.strategy === activeStrategy;
                  return (
                    <g key={f}>
                      <text x={x} y={68} fontSize={12} fill="var(--v4-muted)" textAnchor="middle">
                        ×{f}
                      </text>
                      <a
                        href={arbeitWirkungHref(monthKey, f, strategy)}
                        aria-label={`${NATIONAL_FLEET_STRATEGY_UI[strategy].shortDe}, ×${f}, ${formatQuantity(p.chargeGwh, "de", 1)} GWh Ladung`}
                        aria-current={active ? "true" : undefined}
                      >
                        <circle cx={x} cy={y} r={5} className={`${styles.pointDot} ${styles[strategy]}${active ? ` ${styles.isActive}` : ""}`} />
                      </a>
                      <text x={x} y={y - 8} fontSize={12} textAnchor="middle">
                        {formatQuantity(p.chargeGwh, "de", p.chargeGwh > 100 ? 0 : 1)} GWh
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          ))}
        </div>
        <p className={`v4-footnote num ${styles.annotationMuted}`}>
          Ref. ohne Speicher {formatQuantity(model.refPeakGw, "de", 2)} GW
          {formatKonzeptPeakInstant(model.refPeakTs) ? `, ${formatKonzeptPeakInstant(model.refPeakTs)} Uhr` : ""}.
          {marktX10Detail
            ? ` Markt ×10: ${formatQuantity(model.marktX10?.peakAfterGw ?? 0, "de", 2)} GW — ${formatQuantity(marktX10Detail.residualGw, "de", 2)} GW Restlast + ${formatQuantity(marktX10Detail.chargeGw, "de", 1)} GW Laden bei ${formatQuantity(marktX10Detail.priceEurMwh, "de", 2)} €/MWh (Preis-Kontext).`
            : null}
        </p>
        <table className="sr-only">
          <caption>Arbeit gegen Wirkung</caption>
          <thead>
            <tr>
              <th>Ziel</th>
              <th>Faktor</th>
              <th>Ladung GWh</th>
              <th>Wirkung GW</th>
            </tr>
          </thead>
          <tbody>
            {model.points.map((p) => (
              <tr key={`${p.strategy}-${p.factor}`}>
                <td>{NATIONAL_FLEET_STRATEGY_UI[p.strategy].shortDe}</td>
                <td>×{p.factor}</td>
                <td>{formatQuantity(p.chargeGwh, "de", 2)}</td>
                <td>{formatQuantity(p.wirkungGw, "de", 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </section>
  );
}

export function MonatDauerlinieChart({
  model,
  monthKey,
  activeFactor,
  activeStrategy,
  fleetAvailable,
}: {
  model: DauerlinieModel;
  monthKey: string;
  activeFactor: NationalFleetFactor;
  activeStrategy: NationalFleetStrategyUi;
  fleetAvailable: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [morph, setMorph] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 0,
  );

  useEffect(() => {
    if (morph >= 1) {
      return;
    }
    const el = hostRef.current;
    if (!el) return;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.15;
      const end = vh * 0.85;
      const t = (start - rect.top) / (end - start + rect.height);
      setMorph(Math.min(1, Math.max(0, t)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [morph]);

  const morphT = morph;

  const pathD = useMemo(() => {
    const n = model.intervalCount;
    const yMin = Math.min(model.observedMinGw, model.withStorageMinGw ?? model.observedMinGw) - 2;
    const yMax = Math.max(model.observedMaxGw, model.withStorageMaxGw ?? model.observedMaxGw) + 2;
    const plotH = 200;
    const plotW = 600;
    const y = (gw: number) => 20 + plotH - ((gw - yMin) / (yMax - yMin)) * plotH;
    const step = Math.ceil(n / 400);
    let dObs = "";
    let dStor = "";
    for (let i = 0; i < n; i += step) {
      const pt = model.points[i];
      const x = (morphX(pt.chronIndex, pt.sortRank, morphT, n) / n) * plotW + 40;
      const seg = `${dObs ? "L" : "M"}${x.toFixed(1)},${y(pt.observedGw).toFixed(1)}`;
      dObs += seg;
      if (fleetAvailable && pt.withStorageGw != null) {
        dStor += `${dStor ? "L" : "M"}${x.toFixed(1)},${y(pt.withStorageGw).toFixed(1)}`;
      }
    }
    return { dObs, dStor, yMin, yMax, plotH, plotW };
  }, [fleetAvailable, model, morphT]);

  return (
    <section ref={hostRef} className={`v4-chapter v4-content ${styles.sectionC}`} aria-labelledby="monat-dauerlinie-title">
      <h2 id="monat-dauerlinie-title" className="v4-chapter-h2">
        Der Monat sortiert sich
      </h2>
      <p className="v4-subline">
        {fleetAvailable
          ? `${formatQuantity(model.hoursAbove60Observed, "de", 0)} h über 60 GW ohne Speicher — gewählt: ${NATIONAL_FLEET_STRATEGY_UI[activeStrategy].shortDe} ×${activeFactor}.`
          : "Beobachtete Restlast — ohne Modelllauf für diesen Monat."}
      </p>
      <figure className={styles.figure}>
        <div className={`${styles.chartShell} ${styles.morphHost}`}>
          <svg viewBox={`0 0 ${pathD.plotW + 80} ${pathD.plotH + 50}`} className={styles.svg} role="img">
            <line x1={40} x2={pathD.plotW + 40} y1={20 + pathD.plotH * 0.5} y2={20 + pathD.plotH * 0.5} className={styles.gridLine} />
            <path d={pathD.dObs} fill="none" stroke="hsl(var(--foreground))" strokeWidth={1.8} opacity={0.85} />
            {pathD.dStor ? (
              <path
                d={pathD.dStor}
                fill="none"
                stroke={activeStrategy === "spitze" ? "#e86a3a" : activeStrategy === "markt" ? "#f5b731" : "#0b9f84"}
                strokeWidth={2}
              />
            ) : null}
          </svg>
        </div>
        <p className={`${styles.morphNote} num`}>
          {morphT < 0.98 ? "Scrollen: chronologisch → sortiert" : "Sortierte Dauerlinie (höchste Restlast links)"}
        </p>
      </figure>
    </section>
  );
}

export function MonatKonzeptWerkbank({
  monthKey,
  factor,
  strategy,
  open,
  peakReductionGw,
  peakReductionPct,
}: {
  monthKey: string;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  open: boolean;
  peakReductionGw: number;
  peakReductionPct: number;
}) {
  if (!open) {
    return (
      <p className={`v4-content v4-footnote ${styles.workbenchHead}`}>
        Punkt wählen (↑↓ Ziel, ←→ Faktor) — Viertelstundenkurve folgt.
      </p>
    );
  }
  return (
    <div className={`v4-content ${styles.workbench}`}>
      <p className={`v4-footnote num ${styles.workbenchHead}`}>
        {NATIONAL_FLEET_STRATEGY_UI[strategy].shortDe} · ×{factor} ·{" "}
        <Link href={arbeitWirkungHref(monthKey, factor, strategy)} className="v4-footnote-link">
          Laufparameter
        </Link>
      </p>
      <NationalFleetTimeSeriesChart
        monthKey={monthKey}
        factor={factor}
        strategy={strategy}
        peakReductionGw={peakReductionGw}
        peakReductionPct={peakReductionPct}
        prominentMonth
      />
    </div>
  );
}
