"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import styles from "@/components/monat-v1/monat-v1.module.css";
import { formatGwAbs, formatGwReduction } from "@/lib/monatV1Format";
import type { MonatV1Model } from "@/lib/monatV1Model";
import { MONAT_V1_GRAPH_CAPTION } from "@/lib/monatV1Format";

const FACTOR_TICKS = [1, 2, 3, 5, 10] as const;
const FACTOR_PLOT = [1, 2, 5, 10] as const;

function factorX(factor: number, plotW: number, padL: number): number {
  return padL + ((factor - 1) / 9) * plotW;
}

function yGw(gw: number, yMin: number, yMax: number, plotH: number, padT: number): number {
  return padT + plotH - ((gw - yMin) / (yMax - yMin)) * plotH;
}

function useLayout(minWidth = 720) {
  const ref = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => setWide(el.clientWidth >= minWidth);
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    apply();
    return () => ro.disconnect();
  }, [minWidth]);
  return { ref, wide };
}

function HeroChart({ model }: { model: MonatV1Model }) {
  const { ref, wide } = useLayout();
  const vb = wide ? { w: 1152, h: 460, L: 52, R: 188, T: 32, B: 62 } : { w: 350, h: 348, L: 38, R: 26, T: 24, B: 54 };
  const plotW = vb.w - vb.L - vb.R;
  const plotH = vb.h - vb.T - vb.B;
  const { yMinGw, yMaxGw, refPeakGw } = model;

  const spitzePts = useMemo(
    () =>
      FACTOR_PLOT.map((f) => {
        const p = model.hero.points.find((x) => x.factor === f)!;
        return { f, x: factorX(f, plotW, vb.L), y: yGw(p.spitzeGw, yMinGw, yMaxGw, plotH, vb.T), gw: p.spitzeGw };
      }),
    [model.hero.points, plotW, vb.L, plotH, vb.T, yMinGw, yMaxGw],
  );

  const ueberPts = FACTOR_PLOT.map((f) => {
    const p = model.hero.points.find((x) => x.factor === f)!;
    return { f, x: factorX(f, plotW, vb.L), y: yGw(p.ueberschussGw, yMinGw, yMaxGw, plotH, vb.T) };
  });

  const marktPts = [
    { f: 3, gw: model.hero.marktFromFactor3Gw, x: factorX(3, plotW, vb.L) },
    ...FACTOR_PLOT.filter((f) => f >= 5).map((f) => {
      const p = model.hero.points.find((x) => x.factor === f)!;
      return { f, gw: p.marktGw!, x: factorX(f, plotW, vb.L) };
    }),
  ].map((p) => ({ ...p, y: yGw(p.gw, yMinGw, yMaxGw, plotH, vb.T) }));

  const refY = yGw(refPeakGw, yMinGw, yMaxGw, plotH, vb.T);
  const yTicks = wide
    ? model.yTicksGw
    : [40, 60, 80, 100].filter((t) => t >= yMinGw && t <= yMaxGw);
  const lastSpitze = spitzePts[spitzePts.length - 1]!;

  return (
    <div ref={ref} className={styles.chartWrap} data-testid="monat-v1-hero">
      <svg viewBox={`0 0 ${vb.w} ${vb.h}`} className={styles.svg} role="img" aria-labelledby="g1-title g1-desc">
        <title id="g1-title">Höchste Restlast je Flottenstufe und Fahrweise</title>
        <desc id="g1-desc">
          Spitzenorientiert sinkt die Monatsspitze mit wachsender Flotte; Marktorientiert ohne Preisrückwirkung steigt
          ab ×3 über die beobachtete Oktober-Spitze.
        </desc>
        <defs>
          <pattern id="hatch-markt" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" stroke="#B4532A" strokeWidth="1.25" />
          </pattern>
        </defs>
        {yTicks.map((tick) => {
          const y = yGw(tick, yMinGw, yMaxGw, plotH, vb.T);
          return (
            <g key={tick}>
              <line x1={vb.L} x2={vb.L + plotW} y1={y} y2={y} stroke="var(--mv-gridline, #e4e4dc)" strokeWidth="1" />
              <text x={vb.L - 4} y={y + 4} textAnchor="end" fill="var(--mv-muted, #43474c)">
                {tick}
              </text>
            </g>
          );
        })}
        {!yTicks.some((t) => Math.abs(t - refPeakGw) < 0.05) ? (
          <g>
            <line
              x1={vb.L}
              x2={vb.L + plotW}
              y1={refY}
              y2={refY}
              stroke="var(--mv-gridline, #e4e4dc)"
              strokeWidth="1"
              strokeDasharray={wide ? "0" : "3 3"}
            />
            <text x={vb.L - 4} y={refY + 4} textAnchor="end" fill="var(--mv-muted, #43474c)">
              {refPeakGw.toFixed(1).replace(".", ",")}
            </text>
          </g>
        ) : null}
        <text x={vb.L - 4} y={vb.T - 8} textAnchor="end" fill="var(--mv-muted, #43474c)" fontSize="12">
          GW
        </text>
        {FACTOR_TICKS.map((f) => {
          const x = factorX(f, plotW, vb.L);
          const gw = ((4640 * f) / 1000).toFixed(f === 10 ? 0 : 1).replace(".", ",");
          return (
            <g key={f}>
              <line x1={x} x2={x} y1={vb.T + plotH} y2={vb.T + plotH + 4} stroke="var(--mv-ink)" />
              <text
                x={x}
                y={vb.T + plotH + 16}
                textAnchor="middle"
                fill="var(--mv-ink)"
                fontWeight={f === 3 ? 500 : 400}
              >
                ×{f}
              </text>
              <text x={x} y={vb.T + plotH + 30} textAnchor="middle" fill="var(--mv-muted, #43474c)">
                {gw}
              </text>
            </g>
          );
        })}
        <rect x={vb.L} y={vb.T} width={plotW} height={refY - vb.T} fill="rgba(180, 83, 42, 0.1)" />
        <line x1={vb.L} x2={vb.L + plotW} y1={refY} y2={refY} stroke="var(--mv-ink)" strokeWidth="1.25" />
        <text
          x={wide ? vb.L + plotW * 0.42 : vb.L + plotW - 6}
          y={wide ? vb.T + 14 : vb.T + 12}
          textAnchor={wide ? "start" : "end"}
          fill="var(--mv-ink)"
          fontSize="12"
        >
          Oktober, beobachtet
        </text>
        <polyline
          fill="none"
          stroke="var(--mv-ink)"
          strokeWidth="2.5"
          points={spitzePts.map((p) => `${p.x},${p.y}`).join(" ")}
        />
        {spitzePts.map((p) => (
          <circle key={p.f} cx={p.x} cy={p.y} r="4" fill="var(--mv-ink)" />
        ))}
        <polyline
          fill="none"
          stroke="var(--mv-muted, #43474c)"
          strokeWidth="2"
          points={ueberPts.map((p) => `${p.x},${p.y}`).join(" ")}
        />
        {ueberPts.map((p) => (
          <circle key={p.f} cx={p.x} cy={p.y} r="4" fill="var(--mv-flaeche, #fff)" stroke="var(--mv-muted)" strokeWidth="1.75" />
        ))}
        {marktPts.length >= 2 ? (
          <polygon
            points={`${marktPts.map((p) => `${p.x},${p.y}`).join(" ")} ${marktPts[marktPts.length - 1]!.x},${refY} ${marktPts[0]!.x},${refY}`}
            fill="url(#hatch-markt)"
            opacity="0.35"
          />
        ) : null}
        <polyline
          fill="none"
          stroke="#B4532A"
          strokeWidth="2.25"
          strokeDasharray="7 5"
          points={marktPts.map((p) => `${p.x},${p.y}`).join(" ")}
        />
        {marktPts.length > 0 ? (
          <circle cx={marktPts[0]!.x} cy={marktPts[0]!.y} r="4" fill="var(--mv-flaeche, #fff)" stroke="#B4532A" strokeWidth="1.75" />
        ) : null}
        <text
          x={wide ? vb.L + plotW + 12 : lastSpitze.x + 6}
          y={lastSpitze.y}
          fill="var(--mv-ink)"
          fontSize="12"
        >
          Spitze
        </text>
        <text x={wide ? vb.L + plotW + 12 : vb.L + plotW * 0.55} y={wide ? ueberPts[ueberPts.length - 1]!.y + 4 : ueberPts[0]!.y} fill="var(--mv-muted)" fontSize="12">
          Überschuss
        </text>
        {wide ? (
          <text
            x={vb.L + plotW + 12}
            y={marktPts[0]!.y - 16}
            fill="var(--mv-ink)"
            stroke="var(--mv-flaeche, #fff)"
            strokeWidth="3"
            paintOrder="stroke"
            fontSize="12"
          >
            <tspan x={vb.L + plotW + 12}>Markt · ohne</tspan>
            <tspan x={vb.L + plotW + 12} dy="14">
              Preisrückwirkung
            </tspan>
          </text>
        ) : (
          <>
            <text x={vb.L + 8} y={90} fill="var(--mv-ink)" fontSize="12">
              Markt
            </text>
            <text x={vb.L + 8} y={104} fill="var(--mv-ink)" fontSize="12">
              ohne Preisrückwirkung
            </text>
          </>
        )}
      </svg>
      <p className={styles.figcaption}>{MONAT_V1_GRAPH_CAPTION}</p>
      <table className={styles.valuesTable}>
        <caption>Keine Euro im Graph; Markt ×5/×10 ohne Preisrückwirkung.</caption>
        <thead>
          <tr>
            <th scope="col">Fahrweise</th>
            <th scope="col">×1</th>
            <th scope="col">×10</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Spitze</th>
            <td>{formatGwAbs(model.heroTable.spitzeX1, 1)}</td>
            <td>{formatGwAbs(model.heroTable.spitzeX10, 1)}</td>
          </tr>
          <tr>
            <th scope="row">Überschuss</th>
            <td>{formatGwAbs(model.heroTable.ueberschussX1, 1)}</td>
            <td>{formatGwAbs(model.heroTable.ueberschussX10, 1)}</td>
          </tr>
          <tr>
            <th scope="row">Markt</th>
            <td>{formatGwAbs(model.heroTable.marktX1, 1)}</td>
            <td>— ohne Preisrückwirkung</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function StundenChart({ model }: { model: MonatV1Model }) {
  const { ref, wide } = useLayout();
  const vb = wide ? { w: 1152, h: 400, L: 52, R: 24, T: 36, B: 48 } : { w: 350, h: 320, L: 38, R: 10, T: 28, B: 44 };
  const plotW = vb.w - vb.L - vb.R;
  const plotH = vb.h - vb.T - vb.B;
  const yMax = 20;
  const dodge = wide ? 12 : 10;
  const cats = model.duration;
  const yRed = (reductionGw: number) => vb.T + plotH - (reductionGw / yMax) * plotH;

  return (
    <div ref={ref} className={styles.chartWrap} data-testid="monat-v1-stunden">
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.dotFilled} /> 1,76 h
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dotHollow} /> 2 h
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dotRust} /> 4 h
        </span>
      </div>
      <svg viewBox={`0 0 ${vb.w} ${vb.h}`} className={styles.svg} role="img" aria-labelledby="g3-title g3-desc">
        <title id="g3-title">Spitzensenkung je Dauer und Flottenstufe</title>
        <desc id="g3-desc">Längere Speicherdauer senkt die Spitze stärker; bei gleicher Leistung begrenzt Energie die Wirkung.</desc>
        {[0, 5, 10, 15, 20].map((tick) => {
          const y = yRed(tick);
          return (
            <g key={tick}>
              <line x1={vb.L} x2={vb.L + plotW} y1={y} y2={y} stroke="var(--mv-gridline, #e4e4dc)" strokeWidth="1" />
              <text x={vb.L - 4} y={y + 4} textAnchor="end" fill="var(--mv-muted)">
                {tick === 0 ? "0" : `−${tick}`}
              </text>
            </g>
          );
        })}
        <text x={vb.L - 4} y={vb.T - 8} textAnchor="end" fill="var(--mv-muted)">
          GW
        </text>
        {cats.map((c, i) => {
          const x = vb.L + ((i + 0.5) / cats.length) * plotW;
          const pts = [
            { off: -dodge, val: c.h176, fill: "var(--mv-ink)", hollow: false, r: 4 },
            { off: 0, val: c.h2, fill: "none", hollow: true, r: 4 },
            { off: dodge, val: c.h4, fill: "#B4532A", hollow: false, r: 6 },
          ];
          return (
            <g key={c.factor}>
              <line x1={x} x2={x} y1={vb.T} y2={vb.T + plotH} stroke="var(--mv-linie)" strokeWidth="2" />
              <text x={x} y={vb.T + plotH + 16} textAnchor="middle" fill="var(--mv-ink)">
                ×{c.factor}
              </text>
              <text x={x} y={vb.T + plotH + 30} textAnchor="middle" fill="var(--mv-muted)">
                {c.powerGwLabel}
              </text>
              <polyline
                fill="none"
                stroke="var(--mv-linie)"
                strokeWidth="1.25"
                points={pts.map((p) => `${x + p.off},${yRed(p.val)}`).join(" ")}
              />
              {pts.map((p) => {
                const y = yRed(p.val);
                return (
                  <g key={p.off}>
                    {p.hollow ? (
                      <circle cx={x + p.off} cy={y} r={p.r} fill="var(--mv-flaeche, #fff)" stroke="var(--mv-muted)" strokeWidth="1.75" />
                    ) : (
                      <circle cx={x + p.off} cy={y} r={p.r} fill={p.fill} />
                    )}
                    {(p.val === c.h4 || (c.factor === 10 && p.val === c.h176)) && wide ? (
                      <text x={x + p.off} y={y - 8} textAnchor="middle" fontSize="12" fill="var(--mv-ink)">
                        {formatGwReduction(p.val, 2)}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </g>
          );
        })}
        {model.showMehrAlsLink && wide ? (
          <g>
            {(() => {
              const i5 = cats.findIndex((c) => c.factor === 5);
              const i10 = cats.findIndex((c) => c.factor === 10);
              const x5 = vb.L + ((i5 + 0.5) / cats.length) * plotW + dodge;
              const x10 = vb.L + ((i10 + 0.5) / cats.length) * plotW - dodge;
              const y5 = yRed(cats[i5]!.h4);
              const y10 = yRed(cats[i10]!.h176);
              return (
                <>
                  <line x1={x5} y1={y5} x2={x10} y2={y10} stroke="var(--mv-muted)" strokeDasharray="4 4" />
                  <text x={(x5 + x10) / 2} y={(y5 + y10) / 2 - 6} textAnchor="middle" fill="var(--mv-muted)" fontSize="12">
                    mehr als
                  </text>
                </>
              );
            })()}
          </g>
        ) : null}
      </svg>
      <p className={styles.figcaption}>{MONAT_V1_GRAPH_CAPTION}</p>
      <table className={styles.valuesTable}>
        <thead>
          <tr>
            <th scope="col">Stufe</th>
            <th scope="col">1,76 h</th>
            <th scope="col">2 h</th>
            <th scope="col">4 h</th>
          </tr>
        </thead>
        <tbody>
          {cats.map((c) => (
            <tr key={c.factor}>
              <th scope="row">×{c.factor}</th>
              <td className={c.factor === 10 ? styles.highlightCell : undefined}>{formatGwReduction(c.h176, 2)}</td>
              <td>{formatGwReduction(c.h2, 2)}</td>
              <td className={c.factor === 5 ? styles.highlightCell : undefined}>{formatGwReduction(c.h4, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UeberschussChart({ model }: { model: MonatV1Model }) {
  const { ref, wide } = useLayout(1100);
  const vb = wide ? { w: 1152, h: 384, poolW: 520 } : { w: 350, h: 404, poolW: 200 };
  const rowH = wide ? 56 : 52;
  const barH = 18;
  const startY = 48;
  const poolX = 40;

  return (
    <div ref={ref} className={styles.chartWrap} data-testid="monat-v1-ueberschuss">
      <svg viewBox={`0 0 ${vb.w} ${vb.h}`} className={styles.svg} role="img" aria-labelledby="g4-title g4-desc">
        <title id="g4-title">Überschuss-Pool und Spitzensenkung</title>
        <desc id="g4-desc">
          Die Überschuss-Strategie füllt den Monats-Pool, senkt die Spitze aber weniger als spitzenorientiertes Fahren.
        </desc>
        <text x={poolX} y={28} fill="var(--mv-ink)">
          Pool {model.surplusPoolGwh.toFixed(1).replace(".", ",")} GWh
        </text>
        <text x={poolX + vb.poolW + 40} y={28} fill="var(--mv-muted)">
          sinkt um
        </text>
        {model.pool.map((row, i) => {
          const y = startY + i * rowH;
          const fillW = (row.poolSharePct / 100) * vb.poolW;
          return (
            <g key={row.factor}>
              <text
                x={poolX + vb.poolW / 2}
                y={y - 4}
                textAnchor="middle"
                fill="var(--mv-ink)"
                fontSize="12"
              >
                ×{row.factor}
              </text>
              <rect x={poolX} y={y} width={vb.poolW} height={barH} fill="var(--mv-linie)" />
              <rect x={poolX} y={y} width={fillW} height={barH} fill="var(--mv-ink)" />
              {fillW > 36 ? (
                <text x={poolX + fillW / 2} y={y + barH - 4} textAnchor="middle" fill="var(--mv-bg, #f6f6f3)" fontSize="12">
                  {row.poolLabel}
                </text>
              ) : (
                <text x={poolX + fillW / 2} y={y + barH - 4} textAnchor="middle" fill="var(--mv-ink)" fontSize="12">
                  {row.poolLabel}
                </text>
              )}
              <text x={poolX + vb.poolW + 16} y={y + barH - 2} fill="var(--mv-ink)" fontSize="12">
                {formatGwReduction(row.reductionGw, 2)}
              </text>
            </g>
          );
        })}
        <text x={poolX} y={startY + model.pool.length * rowH + 24} fill="var(--mv-ink)" fontWeight="500">
          Bei ×10, zum Vergleich
        </text>
        {[
          { label: "Überschuss", gw: model.compareX10.ueberschussGw, color: "var(--mv-muted)" },
          { label: "dieselbe Flotte, spitzenorientiert", gw: model.compareX10.spitzeGw, color: "var(--mv-ink)" },
        ].map((row, i) => {
          const y = startY + model.pool.length * rowH + 44 + i * (rowH - 8);
          const maxGw = 16;
          const w = (row.gw / maxGw) * vb.poolW;
          return (
            <g key={row.label}>
              <text x={poolX + vb.poolW / 2} y={y - 4} textAnchor="middle" fill="var(--mv-muted)" fontSize="12">
                {wide ? row.label : row.label === "Überschuss" ? "Überschuss" : "Spitze, orientiert"}
              </text>
              <rect x={poolX} y={y} width={vb.poolW} height={barH} fill="var(--mv-linie)" />
              <rect x={poolX} y={y} width={w} height={barH} fill={row.color} />
              <text x={poolX + vb.poolW + 16} y={y + barH - 2} fill="var(--mv-ink)" fontSize="12">
                {formatGwReduction(row.gw, 2)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className={styles.figcaption}>{MONAT_V1_GRAPH_CAPTION}</p>
    </div>
  );
}

export function MonatV1Charts({ model }: { model: MonatV1Model }) {
  return (
    <>
      <section className={styles.section} aria-labelledby="monat-v1-a1">
        <h1 id="monat-v1-a1" className={styles.h1}>
          Dieselbe Flotte senkt
          <br />
          die{"\u00A0"}Spitze
          <br />
          oder hebt sie.
        </h1>
        <p className={styles.lead}>
          Drei Fahrweisen auf derselben Restlast: netz- und spitzenorientiert, Überschuss und Markt ohne
          Preisrückwirkung ab ×3.
        </p>
        <div className={styles.insight}>
          <div>
            {formatGwAbs(model.hero.insightSpitzeX10Gw, 1)}
            <div className={styles.insightMuted}>Spitze · ×10 · fällt</div>
          </div>
          <div>
            {model.hero.kipppunktLabel}
            <div className={styles.insightMuted}>Markt über {model.refPeakGw.toFixed(1).replace(".", ",")} GW, ohne Preisrückwirkung</div>
          </div>
        </div>
        <HeroChart model={model} />
      </section>
      <section className={styles.section} aria-labelledby="monat-v1-a3">
        <h2 id="monat-v1-a3" className={styles.h2}>
          Es fehlen Stunden, nicht Gigawatt.
        </h2>
        <p className={styles.lead}>
          Bei gleicher Nennleistung begrenzt die nutzbare Energie die Spitzensenkung — längere Dauer wirkt stärker als
          mehr Gigawatt-Leistung allein.
        </p>
        <StundenChart model={model} />
      </section>
      <section className={styles.section} aria-labelledby="monat-v1-a4">
        <h2 id="monat-v1-a4" className={styles.h2}>
          Überschuss allein trägt nicht.
        </h2>
        <p className={styles.lead}>
          Der Aufnahme-Pool ist bei ×10 voll, die Spitzensenkung bleibt deutlich unter spitzenorientiertem Fahren.
        </p>
        <UeberschussChart model={model} />
      </section>
    </>
  );
}
