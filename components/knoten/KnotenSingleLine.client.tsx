"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "@/components/knoten/knoten.module.css";
import type { KnotenPalette } from "@/components/knoten/useKnotenTheme";
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

  const effectiveMode: Mode = isCustom ? "knoten" : mode;
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
    bessMw > 0.15 ? "BESS lädt" : bessMw < -0.15 ? "BESS entlädt" : "BESS im Leerlauf";
  const currentSoc = socPct?.[slot];

  return (
    <section className={styles.singleLineCard} aria-labelledby="knoten-singleline-title">
      <div className={styles.singleLineHead}>
        <div>
          <p className={styles.chipGroupLabel} style={{ marginTop: 0 }}>
            Live-Schaltbild · HS/MS-Umspannwerk
          </p>
          <h2 id="knoten-singleline-title" className={styles.utilityTitle}>
            Leistungsfluss um {timeLabel} · Trafo-Auslastung {Math.round(utilPct)}{"\u00A0"}% ({trafoStatus})
          </h2>
        </div>

        <div className={styles.singleLineActions}>
          {!isCustom ? (
            <div className={styles.modeToggle} role="group" aria-label="Fahrplan im Schaltbild">
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
            </div>
          ) : null}
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

      <div className={styles.singleLineSvgWrap}>
        <svg
          viewBox="0 0 760 212"
          className={styles.singleLineSvg}
          role="img"
          aria-label={`Umspannwerk-Schaltbild um ${timeLabel}: Transformator ${fmtSignedMw(trafoMw)} (${Math.round(utilPct)} Prozent von ±${limitMw} MW), Speicher ${fmtSignedMw(bessMw)}, Knotenlast ${fmtSignedMw(baseMw)}.`}
        >
          {/* 110 kV Busbar (left) */}
          <rect x={18} y={54} width={118} height={96} rx={10} fill="none" stroke={colors.linie} strokeWidth={1.5} />
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

          {/* Animated Flow Line: Grid <-> Trafo */}
          <line x1={136} y1={102} x2={258} y2={102} stroke={colors.linie} strokeWidth={5} strokeLinecap="round" />
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

          {/* Trafo Block (center) */}
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
          {/* Classic dual-winding transformer symbol */}
          <circle cx={340} cy={88} r={16} fill="none" stroke={colors.ink} strokeWidth={2} />
          <circle cx={368} cy={88} r={16} fill="none" stroke={trafoColor} strokeWidth={2} />
          <text x={354} y={124} textAnchor="middle" fill={trafoColor} fontSize={15} fontWeight={700} fontFamily="var(--font-mono)">
            {Math.round(utilPct)}{"\u00A0"}% · {trafoStatus}
          </text>
          {/* Utilization progress bar */}
          <rect x={282} y={136} width={144} height={10} rx={5} fill={colors.grid} />
          <rect
            x={282}
            y={136}
            width={Math.min(144, (Math.min(utilPct, 130) / 100) * 110)}
            height={10}
            rx={5}
            fill={trafoColor}
          />
          {/* 100% limit tick */}
          <line x1={392} y1={133} x2={392} y2={149} stroke={colors.ink} strokeWidth={1.5} />
          <text x={392} y={160} textAnchor="middle" fill={colors.muted} fontSize={10} fontFamily="var(--font-mono)">
            100{"\u00A0"}%
          </text>

          {/* MS Busbar vertical split */}
          <line x1={446} y1={102} x2={504} y2={102} stroke={colors.ink} strokeWidth={2.5} />
          <line x1={504} y1={56} x2={504} y2={150} stroke={colors.ink} strokeWidth={3} />

          {/* Branch 1: Knoten Basislast / EE (top right) */}
          <line x1={504} y1={56} x2={566} y2={56} stroke={colors.gray} strokeWidth={2.5} />
          <rect x={568} y={18} width={174} height={76} rx={10} fill="none" stroke={colors.linie} strokeWidth={1.5} />
          <text x={655} y={38} textAnchor="middle" fill={colors.muted} fontSize={11} fontFamily="var(--font-mono)">
            KNOTEN (OHNE BESS)
          </text>
          <text x={655} y={62} textAnchor="middle" fill={colors.ink} fontSize={15} fontWeight={600} fontFamily="var(--font-mono)">
            {fmtSignedMw(baseMw)}
          </text>
          <text x={655} y={80} textAnchor="middle" fill={colors.muted} fontSize={11}>
            {baseMw >= 0 ? "Netto-Verbrauch" : "Netto-EE-Einspeisung"}
          </text>

          {/* Branch 2: BESS (bottom right) */}
          <line
            x1={504}
            y1={150}
            x2={566}
            y2={150}
            stroke={Math.abs(bessMw) > 0.15 ? (effectiveMode === "markt" ? colors.rust : colors.teal) : colors.linie}
            strokeWidth={2.5}
            strokeDasharray={Math.abs(bessMw) > 0.15 ? "6 4" : undefined}
            className={
              bessMw > 0.15
                ? styles.flowForward
                : bessMw < -0.15
                  ? styles.flowReverse
                  : undefined
            }
          />
          <rect
            x={568}
            y={112}
            width={174}
            height={82}
            rx={10}
            fill="none"
            stroke={effectiveMode === "markt" ? colors.rust : colors.teal}
            strokeWidth={1.75}
          />
          <text x={655} y={132} textAnchor="middle" fill={colors.muted} fontSize={11} fontFamily="var(--font-mono)">
            GROSSSPEICHER (BESS)
          </text>
          <text
            x={655}
            y={155}
            textAnchor="middle"
            fill={effectiveMode === "markt" ? colors.rust : colors.teal}
            fontSize={15}
            fontWeight={700}
            fontFamily="var(--font-mono)"
          >
            {fmtMwAbs(bessMw)}
          </text>
          <text x={655} y={175} textAnchor="middle" fill={colors.muted} fontSize={11}>
            {bessStateLabel}
            {currentSoc != null ? ` · SoC ${Math.round(currentSoc)}\u00A0%` : ""}
          </text>
        </svg>
      </div>

      <div className={styles.scrubberRow}>
        <label htmlFor="knoten-time-scrubber" className={styles.scrubberLabel}>
          Zeitpunkt: <strong>{timeLabel}</strong>
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
