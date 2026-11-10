"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

import styles from "@/components/research/research.module.css";
import { useResearchLayout } from "@/components/research/useResearchLayout";
import { VisionPlot } from "@/components/research/VisionPlot";
import { ResearchSubnav } from "@/components/research/ResearchSubnav";
import { formatGwSenkung, GW_MINUS } from "@/lib/research/fleetBasis";
import type { VisionPageModel, VisionStageId } from "@/lib/research/researchTypes";

const DURATIONS = [
  { key: "1.76" as const, label: "1,76 h" },
  { key: "2" as const, label: "2 h" },
  { key: "4" as const, label: "4 h" },
];

const VISION_SKIP_KEY = "speicherpilot-vision-guess-skip";

export function VisionPage({ model }: { model: VisionPageModel }) {
  const reduced = useReducedMotion();
  const layout = useResearchLayout();
  const [duration, setDuration] = useState<"1.76" | "2" | "4">(model.defaultDuration);
  const [stageId, setStageId] = useState<VisionStageId>(model.defaultStage);
  const [guessMode, setGuessMode] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(VISION_SKIP_KEY) !== "1";
  });
  const [gapLabel, setGapLabel] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(VISION_SKIP_KEY) === "1";
  });

  const stage = model.curve.find((s) => s.id === stageId)!;
  const truth = stage.senkungGw[duration];
  const hero = formatGwSenkung(truth);
  const nepLabel = stage.label.length === 1 ? stage.label : null;
  const inGuess = guessMode && !revealed;
  const showTruth = !inGuess;

  return (
    <div className={styles.page}>
      <ResearchSubnav active="vision" />
      <p className={styles.eyebrow}>VISION · {model.monthLabel.toUpperCase()} · MONATSHORIZONT</p>
      <h1 className={styles.h1}>Mehr Gigawatt helfen. Mehr Stunden helfen mehr.</h1>

      {showTruth ? (
        <>
          <motion.div
            className={styles.heroNum}
            key={`${stageId}-${duration}-${truth.toFixed(3)}`}
            initial={reduced ? false : { opacity: 0.5, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.4 }}
            aria-live="polite"
          >
            {hero}
          </motion.div>
          <p className={styles.meta}>
            {nepLabel ? `NEP ${nepLabel} · ` : null}
            {stage.powerGw.toFixed(1).replace(".", ",")} GW · {DURATIONS.find((d) => d.key === duration)?.label} · Modell · national
          </p>
          <p className={styles.meta}>mit 4 h: {formatGwSenkung(stage.senkungGw["4"])}</p>
        </>
      ) : (
        <>
          <div className={styles.heroNum} aria-hidden>
            ?
          </div>
          <p className={styles.meta}>Erst deine Schätzung — dann die Kurven.</p>
        </>
      )}

      <div className={styles.seg} role="group" aria-label="Dauer">
        {DURATIONS.map((d) => (
          <button key={d.key} type="button" aria-pressed={duration === d.key} onClick={() => setDuration(d.key)}>
            {d.label}
          </button>
        ))}
      </div>

      {inGuess ? (
        <div style={{ marginTop: 8 }}>
          <p className={styles.h2}>Erst schätzen, dann sehen</p>
          <p className={styles.meta}>Ziehe den Punkt bei NEP B vertikal — dann erscheinen die Kurven.</p>
        </div>
      ) : null}

      {gapLabel ? (
        <p className={styles.meta} style={{ marginTop: 4 }}>
          {gapLabel}
        </p>
      ) : null}

      <VisionPlot
        model={model}
        duration={duration}
        stageId={stageId}
        onStage={setStageId}
        guessMode={inGuess}
        width={layout.vision.width}
        height={layout.vision.height}
        onGuessEnd={(guess, truthGw) => {
          const diff = Math.abs(guess - truthGw);
          setGapLabel(
            diff < 0.15
              ? "Fast getroffen."
              : `Abstand zur Schätzung: ${formatGwSenkung(diff).replace(GW_MINUS, "")}`
          );
          setRevealed(true);
        }}
      />

      {inGuess ? (
        <div className={styles.skipWrap}>
          <button type="button" className={styles.skip} onClick={onSkip}>
            Überspringen
          </button>
        </div>
      ) : null}

      <p className={styles.meta} style={{ marginTop: 8 }}>
        Ziehen = Stufe · A/B/C = NEP · Spitze {model.peakGw.toFixed(1).replace(".", ",")} GW · Monatshorizont
      </p>
      <p className={styles.meta}>* BDEW, Momentaufnahme 11/2025, laut BDEW ≥ 50 % nicht realisiert</p>

      <footer className={styles.footer}>
        <Link href="/methodik#annahmen">Annahmen &amp; Grenzen ↗</Link>
        <p style={{ marginTop: 8 }}>Flotte 4,64 GW / 8,15 GWh, Stand 31.10. · battery-charts.de</p>
      </footer>
    </div>
  );

  function onSkip() {
    window.localStorage.setItem(VISION_SKIP_KEY, "1");
    setRevealed(true);
    setGuessMode(false);
  }
}
