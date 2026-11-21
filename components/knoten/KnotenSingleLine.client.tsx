"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "@/components/knoten/knoten.module.css";
import type { KnotenPalette } from "@/components/knoten/knotenPalette";
import { slotIndexToTime } from "@/lib/knoten/customProfileSim";

type Mode = "markt" | "knoten";

function fmtSignedMw(v: number): string {
  const sign = v > 0.05 ? "+" : v < -0.05 ? "−" : "";
  return `${sign}${Math.abs(v).toFixed(1).replace(".", ",")}\u00A0MW`;
}

function fmtMwAbs(v: number): string {
  return `${Math.abs(v).toFixed(1).replace(".", ",")}\u00A0MW`;
}

export function KnotenSingleLine({
  base,
  fm,
  fk,
  socPct,
  limitMw,
  isCustom,
  colors,
}: {
  base: number[];
  fm: number[];
  fk: number[];
  socPct?: number[];
  limitMw: number;
  isCustom: boolean;
  colors: KnotenPalette;
}) {
  const [mode, setMode] = useState<Mode>("knoten");
  const [playing, setPlaying] = useState(false);

  const worstSlot = useMemo(() => {
    const ref = isCustom ? base : fm;
    let bestIdx = 76; // 19:00 fallback
    let maxVal = -1;
    for (let i = 0; i < ref.length; i += 1) {
      const a = Math.abs(ref[i] ?? 0);
      if (a > maxVal) {
        maxVal = a;
        bestIdx = i;
      }
    }
    return bestIdx;
  }, [base, fm, isCustom]);

  const [slot, setSlot] = useState<number>(worstSlot);

  useEffect(() => {
    setSlot(worstSlot);
    setPlaying(false);
  }, [worstSlot]);

  useEffect(() => {
    if (!playing) return undefined;
    const id = window.setInterval(() => {
      setSlot((prev) => (prev + 1) % Math.max(1, base.length));
    }, 150);
    return () => window.clearInterval(id);
  }, [base.length, playing]);

  const effectiveMode: Mode = mode;
  const baseMw = base[slot] ?? 0;
  const trafoMw = effectiveMode === "markt" ? (fm[slot] ?? baseMw) : (fk[slot] ?? baseMw);
  const bessMw = trafoMw - baseMw; // + = charging, - = discharging
  const utilPct = limitMw > 0 ? (Math.abs(trafoMw) / limitMw) * 100 : 0;
  const overload = Math.abs(trafoMw) > limitMw + 0.05;
  const warning = !overload && utilPct >= 85;
  const trafoColor = overload ? colors.rot : warning ? colors.rust : colors.teal;
  const trafoStatus = overload ? "ÜBERLAST" : warning ? "NAHE GRENZE" : "IM LIMIT";

  const timeLabel = `${slotIndexToTime(slot)}\u00A0Uhr`;
  const gridDirectionLabel = trafoMw >= 0 ? "Bezug aus 110\u00A0kV" : "Rückspeisung in 110\u00A0kV";
  const bessStateLabel =
    bessMw > 0.15 ? "BESS lädt" : bessMw < -0.15 ? "BESS entlädt" : "Leerlauf";
  const currentSoc = effectiveMode === "knoten" ? socPct?.[slot] : undefined;
  const bessColor = effectiveMode === "markt" ? colors.rust : colors.teal;

  const ariaDesc = `Umspannwerk-Schaltbild um ${timeLabel}: Transformator ${fmtSignedMw(trafoMw)} (${Math.round(utilPct)} Prozent von ±${limitMw} MW), Speicher ${fmtSignedMw(bessMw)}, Knotenlast ${fmtSignedMw(baseMw)}.`;

  return (
    <section className={styles.singleLineCard} aria-labelledby="knoten-singleline-title">
      <div className={styles.singleLineHead}>
        <div>
          <p className={styles.chipGroupLabel} style={{ marginTop: 0 }}>
            Live-Schaltbild · HS/MS-Umspannwerk
          </p>
          <h2 id="knoten-singleline-title" className={styles.utilityTitle}>
            {timeLabel} · Trafo {Math.round(utilPct)}{"\u00A0"}% ({trafoStatus})
          </h2>
        </div>

        <div className={styles.singleLineActions}>
          <button
            type="button"
            className={`${styles.miniBtn}${effectiveMode === "markt" ? ` ${styles.miniBtnActive}` : ""}`}
            aria-pressed={effectiveMode === "markt"}
            onClick={() => setMode("markt")}
          >
            Markt
          </button>
          <button
            type="button"
            className={`${styles.miniBtn}${effectiveMode === "knoten" ? ` ${styles.miniBtnActive}` : ""}`}
            aria-pressed={effectiveMode === "knoten"}
            onClick={() => setMode("knoten")}
          >
            Knotentreu
          </button>
          <button
            type="button"
            className={styles.miniBtn}
            onClick={() => setPlaying((p) => !p)}
            aria-pressed={playing}
          >
            {playing ? "Pause" : "Abspielen"}
          </button>
          <button
            type="button"
            className={styles.miniBtn}
            onClick={() => {
              setPlaying(false);
              setSlot(worstSlot);
            }}
          >
            Spitze ({slotIndexToTime(worstSlot)})
          </button>
        </div>
      </div>

      {/* Desktop horizontal single-line schematic (>= 600px) */}
      <div className={styles.singleLineDesktop}>
        <svg viewBox="0 0 760 212" className={styles.singleLineSvg} role="img" aria-label={ariaDesc}>
          <rect x={18} y={54} width={118} height={96} rx={10} fill="none" stroke={colors.grid} strokeWidth={1.5} />
          <line x1={32} y1={76} x2={122} y2={76} stroke={colors.ink} strokeWidth={3} />
          <text x={77} y={68} textAnchor="middle" fill={colors.muted} fontSize={11} fontFamily="var(--font-mono)">
            110{"\u00A0"}kV NETZ
          </text>
          <text x={77} y={106} textAnchor="middle" fill={colors.ink} fontSize={16} fontWeight={600} fontFamily="var(--font-mono)">
            {fmtSignedMw(trafoMw)}
          </text>
          <text x={77} y={128} textAnchor="middle" fill={colors.muted} fontSize={11}>
            {gridDirectionLabel}
          </text>

          <line x1={136} y1={102} x2={258} y2={102} stroke={colors.grid} strokeWidth={5} strokeLinecap="round" />
          <line
            x1={136}
            y1={102}
            x2={258}
            y2={102}
            stroke={trafoColor}
            strokeWidth={3}
            strokeDasharray="8 6"
            className={trafoMw >= 0 ? styles.flowForward : styles.flowReverse}
          />
          <polygon
            points={trafoMw >= 0 ? "252,96 262,102 252,108" : "142,96 132,102 142,108"}
            fill={trafoColor}
          />

          <rect
            x={262}
            y={36}
            width={184}
            height={132}
            rx={10}
            fill="none"
            stroke={trafoColor}
            strokeWidth={overload ? 2.5 : 1.75}
          />
          <text x={354} y={56} textAnchor="middle" fill={colors.muted} fontSize={11} fontFamily="var(--font-mono)">
            UMSPANNWERK · ±{limitMw}{"\u00A0"}MW
          </text>
          <circle cx={340} cy={88} r={16} fill="none" stroke={colors.ink} strokeWidth={2} />
          <circle cx={368} cy={88} r={16} fill="none" stroke={trafoColor} strokeWidth={2} />
          <text x={354} y={124} textAnchor="middle" fill={trafoColor} fontSize={15} fontWeight={700} fontFamily="var(--font-mono)">
            {Math.round(utilPct)}{"\u00A0"}% · {trafoStatus}
          </text>
          <rect x={282} y={136} width={144} height={10} rx={5} fill={colors.grid} />
          <rect
            x={282}
            y={136}
            width={Math.min(144, (Math.min(utilPct, 130) / 100) * 110)}
            height={10}
            rx={5}
            fill={trafoColor}
          />
          <line x1={392} y1={133} x2={392} y2={149} stroke={colors.ink} strokeWidth={1.5} />
          <text x={392} y={160} textAnchor="middle" fill={colors.muted} fontSize={10} fontFamily="var(--font-mono)">
            100{"\u00A0"}%
          </text>

          <line x1={446} y1={102} x2={504} y2={102} stroke={colors.ink} strokeWidth={2.5} />
          <line x1={504} y1={56} x2={504} y2={150} stroke={colors.ink} strokeWidth={3} />

          <line x1={504} y1={56} x2={566} y2={56} stroke={colors.gray} strokeWidth={2.5} />
          <rect x={568} y={18} width={174} height={76} rx={10} fill="none" stroke={colors.grid} strokeWidth={1.5} />
          <text x={655} y={38} textAnchor="middle" fill={colors.muted} fontSize={11} fontFamily="var(--font-mono)">
            KNOTEN-BASISLAST
          </text>
          <text x={655} y={62} textAnchor="middle" fill={colors.ink} fontSize={15} fontWeight={600} fontFamily="var(--font-mono)">
            {fmtSignedMw(baseMw)}
          </text>
          <text x={655} y={80} textAnchor="middle" fill={colors.muted} fontSize={11}>
            {baseMw >= 0 ? "Netto-Verbrauch" : "Netto-EE-Einspeisung"}
          </text>

          <line
            x1={504}
            y1={150}
            x2={566}
            y2={150}
            stroke={Math.abs(bessMw) > 0.15 ? bessColor : colors.grid}
            strokeWidth={2.5}
            strokeDasharray={Math.abs(bessMw) > 0.15 ? "6 4" : undefined}
            className={
              bessMw > 0.15 ? styles.flowForward : bessMw < -0.15 ? styles.flowReverse : undefined
            }
          />
          <rect x={568} y={112} width={174} height={82} rx={10} fill="none" stroke={bessColor} strokeWidth={1.75} />
          <text x={655} y={132} textAnchor="middle" fill={colors.muted} fontSize={11} fontFamily="var(--font-mono)">
            GROSSSPEICHER (BESS)
          </text>
          <text x={655} y={155} textAnchor="middle" fill={bessColor} fontSize={15} fontWeight={700} fontFamily="var(--font-mono)">
            {fmtMwAbs(bessMw)}
          </text>
          <text x={655} y={175} textAnchor="middle" fill={colors.muted} fontSize={11}>
            {bessStateLabel}
            {currentSoc != null ? ` · SoC ${Math.round(currentSoc)}\u00A0%` : ""}
          </text>
        </svg>
      </div>

      {/* Mobile vertical 3-tier schematic (< 600px, zero horizontal clipping) */}
      <div className={styles.singleLineMobile}>
        <svg viewBox="0 0 340 278" className={styles.singleLineSvgMobile} role="img" aria-label={ariaDesc}>
          {/* Tier 1: 110 kV Netz */}
          <rect x={44} y={6} width={252} height={54} rx={8} fill="none" stroke={colors.grid} strokeWidth={1.5} />
          <text x={170} y={24} textAnchor="middle" fill={colors.muted} fontSize={10} fontFamily="var(--font-mono)">
            110{"\u00A0"}kV NETZ · {gridDirectionLabel.toUpperCase()}
          </text>
          <text x={170} y={47} textAnchor="middle" fill={colors.ink} fontSize={16} fontWeight={600} fontFamily="var(--font-mono)">
            {fmtSignedMw(trafoMw)}
          </text>

          {/* Vertical Flow: Grid <-> Trafo */}
          <line x1={170} y1={60} x2={170} y2={88} stroke={colors.grid} strokeWidth={4} />
          <line
            x1={170}
            y1={60}
            x2={170}
            y2={88}
            stroke={trafoColor}
            strokeWidth={2.5}
            strokeDasharray="6 4"
            className={trafoMw >= 0 ? styles.flowForward : styles.flowReverse}
          />
          <polygon
            points={trafoMw >= 0 ? "164,84 176,84 170,92" : "164,66 176,66 170,58"}
            fill={trafoColor}
          />

          {/* Tier 2: Umspannwerk Trafo */}
          <rect
            x={24}
            y={92}
            width={292}
            height={78}
            rx={10}
            fill="none"
            stroke={trafoColor}
            strokeWidth={overload ? 2.5 : 1.75}
          />
          <text x={170} y={111} textAnchor="middle" fill={colors.muted} fontSize={10.5} fontFamily="var(--font-mono)">
            UMSPANNWERK · ±{limitMw}{"\u00A0"}MW
          </text>
          <text x={170} y={133} textAnchor="middle" fill={trafoColor} fontSize={15} fontWeight={700} fontFamily="var(--font-mono)">
            {Math.round(utilPct)}{"\u00A0"}% · {trafoStatus}
          </text>
          <rect x={48} y={145} width={244} height={9} rx={4.5} fill={colors.grid} />
          <rect
            x={48}
            y={145}
            width={Math.min(244, (Math.min(utilPct, 130) / 100) * 188)}
            height={9}
            rx={4.5}
            fill={trafoColor}
          />
          <line x1={236} y1={142} x2={236} y2={157} stroke={colors.ink} strokeWidth={1.5} />

          {/* Split to Tier 3 */}
          <line x1={170} y1={170} x2={170} y2={186} stroke={colors.ink} strokeWidth={2.5} />
          <line x1={84} y1={186} x2={256} y2={186} stroke={colors.ink} strokeWidth={2.5} />
          <line x1={84} y1={186} x2={84} y2={200} stroke={colors.gray} strokeWidth={2.5} />
          <line
            x1={256}
            y1={186}
            x2={256}
            y2={200}
            stroke={Math.abs(bessMw) > 0.15 ? bessColor : colors.grid}
            strokeWidth={2.5}
          />

          {/* Tier 3 Left: Knoten-Basislast */}
          <rect x={8} y={200} width={154} height={72} rx={8} fill="none" stroke={colors.grid} strokeWidth={1.5} />
          <text x={85} y={219} textAnchor="middle" fill={colors.muted} fontSize={10} fontFamily="var(--font-mono)">
            BASISLAST
          </text>
          <text x={85} y={242} textAnchor="middle" fill={colors.ink} fontSize={15} fontWeight={600} fontFamily="var(--font-mono)">
            {fmtSignedMw(baseMw)}
          </text>
          <text x={85} y={260} textAnchor="middle" fill={colors.muted} fontSize={10.5}>
            {baseMw >= 0 ? "Verbrauch" : "EE-Einspeisung"}
          </text>

          {/* Tier 3 Right: BESS */}
          <rect x={178} y={200} width={154} height={72} rx={8} fill="none" stroke={bessColor} strokeWidth={1.75} />
          <text x={255} y={219} textAnchor="middle" fill={colors.muted} fontSize={10} fontFamily="var(--font-mono)">
            SPEICHER (BESS)
          </text>
          <text x={255} y={242} textAnchor="middle" fill={bessColor} fontSize={15} fontWeight={700} fontFamily="var(--font-mono)">
            {fmtMwAbs(bessMw)}
          </text>
          <text x={255} y={260} textAnchor="middle" fill={colors.muted} fontSize={10.5}>
            {bessStateLabel}
            {currentSoc != null ? ` · ${Math.round(currentSoc)}\u00A0%` : ""}
          </text>
        </svg>
      </div>

      <div className={styles.scrubberRow}>
        <label htmlFor="knoten-time-scrubber" className={styles.scrubberLabel}>
          Zeit: <strong>{timeLabel}</strong>
        </label>
        <input
          id="knoten-time-scrubber"
          type="range"
          min={0}
          max={Math.max(0, base.length - 1)}
          step={1}
          value={slot}
          onChange={(e) => {
            setPlaying(false);
            setSlot(Number(e.target.value));
          }}
          className={styles.scrubberInput}
          aria-valuetext={timeLabel}
        />
        <span className={styles.scrubberRangeHint}>00:00 – 23:45</span>
      </div>
    </section>
  );
}
