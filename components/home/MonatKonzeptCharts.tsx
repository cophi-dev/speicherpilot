"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import styles from "@/components/home/monat-konzept.module.css";
import { NationalFleetTimeSeriesChart } from "@/components/home/NationalFleetTimeSeriesChart";
import { formatQuantity } from "@/lib/formatQuantity";
import type { ArbeitWirkungModel, ArbeitWirkungPoint, FleetSizeRow } from "@/lib/monatKonzeptA";
import {
  arbeitPathCallouts,
  arbeitWirkungHref,
  formatGwhTick,
  formatKonzeptPeakInstant,
  formatKonzeptWorkbenchCaption,
} from "@/lib/monatKonzeptA";
import type { DauerlinieModel } from "@/lib/monatKonzeptC";
import { morphX } from "@/lib/monatKonzeptC";
import {
  NATIONAL_FLEET_FACTORS,
  NATIONAL_FLEET_STRATEGY_UI,
  type NationalFleetFactor,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";

const STRATEGIES: NationalFleetStrategyUi[] = ["spitze", "ueberschuss", "markt"];
const Y_MIN = -35;
const Y_MAX = 16;
const VIEW_W = 980;
const VIEW_H = 520;
const PAD_L = 58;
const PAD_R = 28;
const PAD_T = 52;
const PAD_B = 64;

function logX(chargeGwh: number, plotW: number): number {
  const minL = Math.log10(10);
  const maxL = Math.log10(10000);
  const v = Math.max(10, chargeGwh);
  const log = Math.log10(v);
  return PAD_L + ((log - minL) / (maxL - minL)) * plotW;
}

function yWirkung(gw: number, plotH: number): number {
  return PAD_T + plotH - ((gw - Y_MIN) / (Y_MAX - Y_MIN)) * plotH;
}

function pointsForStrategy(model: ArbeitWirkungModel, strategy: NationalFleetStrategyUi): ArbeitWirkungPoint[] {
  return NATIONAL_FLEET_FACTORS.map(
    (f) => model.points.find((p) => p.strategy === strategy && p.factor === f)!,
  );
}

function weekdayDeFromTs(ts: string | null | undefined): string | null {
  if (!ts) return null;
  const m = ts.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const wd = d.toLocaleDateString("de-DE", { weekday: "short", timeZone: "UTC" }).replace(".", "");
  return wd.charAt(0).toUpperCase() + wd.slice(1);
}

export function MonatArbeitWirkungChart({
  model,
  monthKey,
  activeFactor,
  activeStrategy,
  fleetSizes,
  marktX10Detail,
  onPointSelect,
}: {
  model: ArbeitWirkungModel;
  monthKey: string;
  activeFactor: NationalFleetFactor;
  activeStrategy: NationalFleetStrategyUi;
  fleetSizes: FleetSizeRow[];
  marktX10Detail?: { residualGw: number; chargeGw: number; priceEurMwh: number } | null;
  onPointSelect?: () => void;
}) {
  const router = useRouter();
  const plotW = VIEW_W - PAD_L - PAD_R;
  const plotH = VIEW_H - PAD_T - PAD_B;
  const yZero = yWirkung(0, plotH);
  const poolX = logX(model.surplusPoolGwh, plotW);
  const pathLabels = arbeitPathCallouts(model);

  const navigate = useCallback(
    (factor: NationalFleetFactor, strategy: NationalFleetStrategyUi) => {
      onPointSelect?.();
      router.push(arbeitWirkungHref(monthKey, factor, strategy), { scroll: false });
    },
    [monthKey, onPointSelect, router],
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
    const cy = yWirkung(p.wirkungGw, plotH);
    const active = p.factor === activeFactor && p.strategy === activeStrategy;
    return (
      <g key={`${p.strategy}-${p.factor}`}>
        <a
          href={arbeitWirkungHref(monthKey, p.factor, p.strategy)}
          className={`${styles.pointDot} ${styles[p.strategy]}${hollow ? ` ${styles.hollow}` : ""}${active ? ` ${styles.isActive}` : ""}`}
          aria-label={`${NATIONAL_FLEET_STRATEGY_UI[p.strategy].shortDe}, ×${p.factor}`}
          aria-current={active ? "true" : undefined}
          onClick={(e) => {
            e.preventDefault();
            navigate(p.factor, p.strategy);
          }}
        >
          <circle cx={cx} cy={cy} r={hollow ? 5.5 : 7} />
        </a>
      </g>
    );
  };

  const labelAnchor = (strategy: NationalFleetStrategyUi) => {
    const pts = pointsForStrategy(model, strategy);
    const anchor = pts[pts.length - 1];
    const cx = logX(anchor.chargeGwh, plotW);
    const cy = yWirkung(anchor.wirkungGw, plotH);
    let lx = cx + (strategy === "markt" ? -12 : 8);
    let ly = cy + (strategy === "spitze" ? -14 : strategy === "ueberschuss" ? -18 : 16);
    if (strategy === "ueberschuss") {
      ly = PAD_T + 22;
      lx = Math.min(poolX - 8, plotW + PAD_L - 120);
    }
    if (strategy === "markt") {
      const markt1 = pts[0];
      lx = logX(markt1.chargeGwh, plotW) + 10;
      ly = yWirkung(markt1.wirkungGw, plotH) - 10;
    }
    return { lx, ly, text: pathLabels[strategy] };
  };

  const marktX10 = model.marktX10;

  return (
    <section className={`v4-chapter v4-content ${styles.sectionA}`} aria-labelledby="monat-arbeit-wirkung-title">
      <h2 id="monat-arbeit-wirkung-title" className="v4-chapter-h2">
        Arbeit gegen Wirkung
      </h2>
      <figure className={styles.figure}>
        <div className={styles.aLayout}>
          <div className={`${styles.chartShell} ${styles.chartShellHero} ${styles.desktopChart}`}>
            {marktX10 && marktX10Detail ? (
              <div className={styles.marktCallout} aria-hidden="true">
                <span className={`${styles.marktCalloutGw} num`}>{formatQuantity(marktX10.peakAfterGw, "de", 2)} GW</span>
                <span className={`${styles.marktCalloutSub} num`}>
                  neue Monatsspitze · {weekdayDeFromTs(marktX10.peakTs) ?? ""}{" "}
                  {formatKonzeptPeakInstant(marktX10.peakTs) ?? ""}
                </span>
                <span className={`${styles.marktCalloutSub} num`}>
                  {formatQuantity(marktX10Detail.residualGw, "de", 2)} GW Restlast +{" "}
                  {formatQuantity(marktX10Detail.chargeGw, "de", 2)} GW Laden ·{" "}
                  {formatQuantity(marktX10Detail.priceEurMwh, "de", 2)} €/MWh
                </span>
              </div>
            ) : null}
            <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className={styles.svg} role="img" aria-labelledby="arbeit-wirkung-aria-title">
              <title id="arbeit-wirkung-aria-title">Arbeit gegen Wirkung — drei Ziele × Faktoren</title>
              <rect x={PAD_L} y={PAD_T} width={plotW} height={yZero - PAD_T} className={styles.negativeFill} />
              {[10, 100, 1000, 10000].map((tick) => (
                <g key={tick}>
                  <line
                    x1={logX(tick, plotW)}
                    x2={logX(tick, plotW)}
                    y1={PAD_T}
                    y2={PAD_T + plotH}
                    className={styles.gridLine}
                  />
                  <text x={logX(tick, plotW)} y={VIEW_H - 28} className={styles.xTick} textAnchor="middle">
                    {formatGwhTick(tick)}
                  </text>
                </g>
              ))}
              <text x={PAD_L + plotW / 2} y={VIEW_H - 8} className={styles.axisTitle} textAnchor="middle">
                Netzseitige Ladung im Monat, GWh (logarithmisch)
              </text>
              {[-30, -20, -10, 0, 5, 10, 15].map((tick) => (
                <g key={tick}>
                  <line
                    x1={PAD_L}
                    x2={VIEW_W - PAD_R}
                    y1={yWirkung(tick, plotH)}
                    y2={yWirkung(tick, plotH)}
                    className={styles.gridLine}
                  />
                  <text x={PAD_L - 8} y={yWirkung(tick, plotH) + 4} className={styles.yTick} textAnchor="end">
                    {tick > 0 ? `+${tick}` : tick}
                  </text>
                </g>
              ))}
              <text x={PAD_L - 8} y={PAD_T - 18} className={styles.yAxisTitle} textAnchor="end">
                Spitze sinkt um … GW
              </text>
              <text x={PAD_L - 8} y={VIEW_H - 46} className={styles.yAxisTitle} textAnchor="end">
                Spitze steigt
              </text>
              {STRATEGIES.map((strategy) => {
                const pts = pointsForStrategy(model, strategy);
                const d = pts
                  .map(
                    (p, i) =>
                      `${i === 0 ? "M" : "L"}${logX(p.chargeGwh, plotW)},${yWirkung(p.wirkungGw, plotH)}`,
                  )
                  .join(" ");
                return <path key={strategy} d={d} className={`${styles.pathLine} ${styles[strategy]}`} />;
              })}
              <line x1={PAD_L} y1={yZero} x2={VIEW_W - PAD_R} y2={yZero} className={styles.zeroLine} />
              <text x={VIEW_W - PAD_R} y={yZero - 6} className={styles.refLineLabel} textAnchor="end">
                Referenz ohne Speicher {formatQuantity(model.refPeakGw, "de", 2)} GW ·{" "}
                {formatKonzeptPeakInstant(model.refPeakTs) ?? "—"}
              </text>
              <line x1={poolX} y1={PAD_T} x2={poolX} y2={PAD_T + plotH} className={styles.poolLine} />
              <text x={poolX} y={PAD_T + 20} className={styles.poolLineLabel} textAnchor="middle">
                Überschuss-Pool {formatQuantity(model.surplusPoolGwh, "de", 1)} GWh
              </text>
              <text x={poolX} y={PAD_T + 34} className={styles.annotationMuted} textAnchor="middle" fontSize={11}>
                mehr Überschuss gab es nicht
              </text>
              {STRATEGIES.map((strategy) => {
                const { lx, ly, text } = labelAnchor(strategy);
                return (
                  <text
                    key={strategy}
                    x={lx}
                    y={ly}
                    className={`${styles.pathLabel} ${styles[strategy]}`}
                    textAnchor={strategy === "markt" ? "start" : "start"}
                  >
                    {text}
                  </text>
                );
              })}
              {STRATEGIES.flatMap((strategy) =>
                pointsForStrategy(model, strategy).map((p) => renderPoint(p, p.factor === 1)),
              )}
            </svg>
          </div>
          <aside className={styles.fleetAside} aria-label="Flottengröße">
            <p className={styles.fleetAsideTitle}>Flottengröße</p>
            <table className={styles.fleetTable}>
              <tbody>
                {fleetSizes.map((row) => (
                  <tr key={row.factor}>
                    <td>×{row.factor}</td>
                    <td>
                      {formatQuantity(row.powerGw, "de", 2)} GW / {formatQuantity(row.energyGwh, "de", 0)} GWh
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={styles.fleetHint}>
              Punkt wählen öffnet die Monatskurve.
              <br />
              ← → Faktor · ↑ ↓ Ziel
            </p>
          </aside>
        </div>
        <MobileArbeitPaths
          model={model}
          monthKey={monthKey}
          activeFactor={activeFactor}
          activeStrategy={activeStrategy}
          onSelect={navigate}
        />
        <p className={`${styles.chartFootnote} num`}>
          Jeder Punkt = ein vorberechneter Lauf (Ziel × Flottenfaktor). Δ GW oben = Referenzspitze ohne Speicher minus
          höchste Restlast mit Speicher im Monat. Modell: Round-Trip 85&nbsp;%, SoC 10–90&nbsp;%, Day-Ahead Price Taker,
          perfekte Voraussicht — ohne Preisrückwirkung bei ×5/×10. Quelle Energy-Charts / SMARD CC BY 4.0.
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

function MobileArbeitPaths({
  model,
  monthKey,
  activeFactor,
  activeStrategy,
  onSelect,
}: {
  model: ArbeitWirkungModel;
  monthKey: string;
  activeFactor: NationalFleetFactor;
  activeStrategy: NationalFleetStrategyUi;
  onSelect: (f: NationalFleetFactor, s: NationalFleetStrategyUi) => void;
}) {
  const plotW = 328;
  const plotH = 88;
  const padL = 36;
  const padR = 8;
  const padT = 14;
  const padB = 22;

  const yMin = Y_MIN;
  const yMax = Y_MAX;
  const y = (gw: number) => padT + plotH - ((gw - yMin) / (yMax - yMin)) * plotH;
  const x = (i: number) => padL + (i / 3) * (plotW - padL - padR);

  return (
    <div className={styles.mobilePaths}>
      {STRATEGIES.map((strategy) => {
        const pts = pointsForStrategy(model, strategy);
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.wirkungGw)}`).join(" ");
        const y0 = y(0);
        return (
          <div key={strategy}>
            <p className={styles.mobilePathTitle}>{NATIONAL_FLEET_STRATEGY_UI[strategy].shortDe}</p>
            <svg viewBox={`0 0 ${plotW} ${plotH + padB + 8}`} className={styles.mobilePathChart}>
              <line x1={padL} x2={plotW - padR} y1={y0} y2={y0} stroke="var(--v4-muted)" strokeWidth={1} />
              <path d={d} fill="none" strokeWidth={2} className={`${styles.pathLine} ${styles[strategy]}`} />
              {pts.map((p, i) => {
                const active = p.factor === activeFactor && p.strategy === activeStrategy;
                const cx = x(i);
                const cy = y(p.wirkungGw);
                return (
                  <g key={p.factor}>
                    <text x={cx} y={plotH + padB + 4} className={styles.xTick} textAnchor="middle">
                      ×{p.factor}
                    </text>
                    <text x={cx} y={plotH + padB + 16} className={styles.xTick} textAnchor="middle" fontSize={10}>
                      {formatQuantity(p.chargeGwh, "de", p.chargeGwh >= 100 ? 0 : 1)} GWh
                    </text>
                    <text x={cx} y={cy - 10} className={styles.yTick} textAnchor="middle" fontWeight={600}>
                      {formatQuantity(p.wirkungGw, "de", 2)}
                    </text>
                    <a
                      href={arbeitWirkungHref(monthKey, p.factor, strategy)}
                      aria-label={`${NATIONAL_FLEET_STRATEGY_UI[strategy].shortDe}, ×${p.factor}, ${formatQuantity(p.wirkungGw, "de", 2)} GW`}
                      aria-current={active ? "true" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        onSelect(p.factor, strategy);
                      }}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        className={`${styles.pointDot} ${styles[strategy]}${active ? ` ${styles.isActive}` : ""}`}
                      />
                    </a>
                  </g>
                );
              })}
            </svg>
          </div>
        );
      })}
    </div>
  );
}

function useMorphScroll(fixedMorph: number | null) {
  const trackRef = useRef<HTMLDivElement>(null);
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [scrollMorph, setScrollMorph] = useState(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (fixedMorph != null && Number.isFinite(fixedMorph)) {
      return;
    }
    if (reducedMotion) {
      return;
    }
    const onScroll = () => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = (vh * 0.25 - rect.top) / Math.max(1, rect.height - vh * 0.35);
      setScrollMorph(Math.min(1, Math.max(0, progress)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [fixedMorph, reducedMotion]);

  const morphT =
    fixedMorph != null && Number.isFinite(fixedMorph)
      ? Math.min(1, Math.max(0, fixedMorph))
      : scrollMorph;

  return { trackRef, morphT };
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
  const searchParams = useSearchParams();
  const morphParam = searchParams.get("morph");
  const fixedMorph = morphParam != null && morphParam !== "" ? Number(morphParam) : null;
  const { trackRef, morphT } = useMorphScroll(fixedMorph);

  const scene = useMemo(() => {
    const n = model.intervalCount;
    const PAD_L_C = 52;
    const PAD_R_C = 24;
    const PAD_T_C = 44;
    const PAD_B_C = 52;
    const plotW = 920;
    const plotH = 300;
    const yMin = Math.min(model.observedMinGw, model.withStorageMinGw ?? model.observedMinGw) - 5;
    const yMax = Math.max(model.observedMaxGw, model.withStorageMaxGw ?? model.observedMaxGw) + 8;
    const yPix = (gw: number) => PAD_T_C + plotH - ((gw - yMin) / (yMax - yMin)) * plotH;
    const step = Math.max(1, Math.ceil(n / 520));
    const samples: { pt: (typeof model.points)[0]; xNorm: number }[] = [];
    for (let i = 0; i < n; i += step) {
      const pt = model.points[i]!;
      samples.push({ pt, xNorm: morphX(pt.chronIndex, pt.sortRank, morphT, n) });
    }
    const ordered = [...samples].sort((a, b) => a.xNorm - b.xNorm);
    const xPix = (xNorm: number) => PAD_L_C + (xNorm / Math.max(1, n - 1)) * plotW;

    let dObs = "";
    let dStor = "";
    let dShave = "";
    const shavePts: string[] = [];
    for (let i = 0; i < ordered.length; i++) {
      const { pt, xNorm } = ordered[i]!;
      const xp = xPix(xNorm);
      const yO = yPix(pt.observedGw);
      dObs += `${dObs ? "L" : "M"}${xp.toFixed(1)},${yO.toFixed(1)}`;
      if (fleetAvailable && pt.withStorageGw != null) {
        const yS = yPix(pt.withStorageGw);
        dStor += `${dStor ? "L" : "M"}${xp.toFixed(1)},${yS.toFixed(1)}`;
        if (activeStrategy === "spitze" && morphT > 0.55 && pt.observedGw > pt.withStorageGw) {
          shavePts.push(`${xp.toFixed(1)},${yO.toFixed(1)}`);
        }
      }
    }
    if (shavePts.length > 2 && activeStrategy === "spitze") {
      const rev: string[] = [];
      for (let i = ordered.length - 1; i >= 0; i--) {
        const { pt, xNorm } = ordered[i]!;
        if (pt.withStorageGw == null || pt.observedGw <= pt.withStorageGw) continue;
        rev.push(`${xPix(xNorm).toFixed(1)},${yPix(pt.withStorageGw).toFixed(1)}`);
      }
      dShave = `M${shavePts.join(" L")} L${rev.join(" L")} Z`;
    }

    const y60 = yPix(60);
    const hours = n * 0.25;
    const storColor =
      activeStrategy === "spitze" ? "#e86a3a" : activeStrategy === "markt" ? "#f5b731" : "#0b9f84";

    return {
      viewW: plotW + PAD_L_C + PAD_R_C,
      viewH: plotH + PAD_T_C + PAD_B_C,
      PAD_L_C,
      plotW,
      plotH,
      PAD_T_C,
      dObs,
      dStor,
      dShave,
      y60,
      yPix,
      yMin,
      yMax,
      hours,
      storColor,
      peakLabel: model.withStorageMaxGw ?? model.observedMaxGw,
      valleyObs: model.observedMinGw,
      valleyStor: model.withStorageMinGw,
    };
  }, [activeStrategy, fleetAvailable, model, morphT]);

  return (
    <section className={`v4-chapter v4-content ${styles.sectionC}`} aria-labelledby="monat-dauerlinie-title">
      <h2 id="monat-dauerlinie-title" className="v4-chapter-h2">
        Der Monat sortiert sich
      </h2>
      <p className="v4-subline">
        {fleetAvailable
          ? `Der Oktober nach Höhe sortiert — gewählt: ${NATIONAL_FLEET_STRATEGY_UI[activeStrategy].shortDe} ×${activeFactor}.`
          : "Beobachtete Restlast — ohne Modelllauf für diesen Monat."}
      </p>
      <figure className={styles.figure}>
        <div ref={trackRef} className={styles.morphScrollTrack}>
          <div className={styles.morphSticky}>
            <div className={`${styles.chartShell} ${styles.chartShellC}`}>
              <svg viewBox={`0 0 ${scene.viewW} ${scene.viewH}`} className={styles.svg} role="img">
                <text x={scene.PAD_L_C - 6} y={scene.PAD_T_C - 18} className={styles.yAxisTitle} textAnchor="end">
                  Restlast, GW
                </text>
                <text
                  x={scene.PAD_L_C + scene.plotW / 2}
                  y={scene.viewH - 10}
                  className={styles.axisTitle}
                  textAnchor="middle"
                >
                  Stunden im Monat, nach Restlast sortiert ({formatQuantity(model.intervalCount, "de", 0)} Viertelstunden)
                </text>
                <line
                  x1={scene.PAD_L_C}
                  x2={scene.PAD_L_C + scene.plotW}
                  y1={scene.y60}
                  y2={scene.y60}
                  className={styles.ref60Line}
                />
                <text x={scene.PAD_L_C + 4} y={scene.y60 - 5} className={styles.dauerLabelMuted} fontSize={11}>
                  60 GW
                </text>
                {scene.dShave ? <path d={scene.dShave} className={styles.shaveFill} /> : null}
                <path d={scene.dObs} fill="none" stroke="hsl(var(--foreground))" strokeWidth={2} opacity={0.9} />
                {scene.dStor ? (
                  <path d={scene.dStor} fill="none" stroke={scene.storColor} strokeWidth={2.5} />
                ) : null}
                {fleetAvailable && morphT > 0.65 ? (
                  <>
                    <text x={scene.PAD_L_C + 8} y={scene.yPix(scene.peakLabel) - 8} className={styles.dauerLabel}>
                      {formatQuantity(scene.peakLabel, "de", 2)} GW
                    </text>
                    {activeStrategy === "spitze" && scene.valleyStor != null ? (
                      <text
                        x={scene.PAD_L_C + scene.plotW - 6}
                        y={scene.yPix(scene.valleyStor) + 16}
                        className={styles.dauerLabelMuted}
                        textAnchor="end"
                      >
                        Tal {formatQuantity(scene.valleyStor, "de", 1)} statt {formatQuantity(scene.valleyObs, "de", 1)}
                      </text>
                    ) : activeStrategy === "markt" && scene.valleyStor != null ? (
                      <text
                        x={scene.PAD_L_C + scene.plotW - 6}
                        y={scene.yPix(scene.valleyStor) + 16}
                        className={styles.dauerLabelMuted}
                        textAnchor="end"
                      >
                        Tal {formatQuantity(scene.valleyStor, "de", 1)} statt {formatQuantity(scene.valleyObs, "de", 1)}
                      </text>
                    ) : null}
                    {activeStrategy === "spitze" ? (
                      <text x={scene.PAD_L_C + scene.plotW * 0.35} y={scene.PAD_T_C + 24} className={styles.dauerLabelMuted}>
                        {formatQuantity(model.observedMaxGw, "de", 2)} → {formatQuantity(scene.peakLabel, "de", 2)} GW
                      </text>
                    ) : null}
                  </>
                ) : null}
              </svg>
            </div>
          </div>
        </div>
        <p className={`${styles.morphNote} num`}>
          {morphT < 0.12
            ? "Chronologisch — weiter scrollen sortiert nach Restlast"
            : morphT < 0.88
              ? "Sortieren …"
              : "Sortierte Dauerlinie (höchste Restlast links)"}
        </p>
        <p className={`${styles.chartFootnote} num`}>
          Weiß: beobachtet (Last − Wind − Sonne). Farbig: gewählter Lauf. Links die höchsten Viertelstunden, rechts die
          niedrigsten.
        </p>
      </figure>
    </section>
  );
}

export function MonatKonzeptWerkbank({
  monthKey,
  factor,
  strategy,
  peakReductionGw,
  peakReductionPct,
  peakAfterGw,
}: {
  monthKey: string;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  peakReductionGw: number;
  peakReductionPct: number;
  peakAfterGw: number;
}) {
  return (
    <div className={`v4-content ${styles.workbench}`}>
      <p className={`v4-footnote num`} style={{ margin: "0 0 8px", fontSize: 13 }}>
        {NATIONAL_FLEET_STRATEGY_UI[strategy].shortDe} · ×{factor} ·{" "}
        <Link href={arbeitWirkungHref(monthKey, factor, strategy)} className="v4-footnote-link">
          Laufparameter
        </Link>{" "}
        — {formatKonzeptWorkbenchCaption(peakAfterGw, peakReductionGw)}
      </p>
      <NationalFleetTimeSeriesChart
        monthKey={monthKey}
        factor={factor}
        strategy={strategy}
        peakReductionGw={peakReductionGw}
        peakReductionPct={peakReductionPct}
        prominentMonth
        konzeptWorkbench
      />
    </div>
  );
}
