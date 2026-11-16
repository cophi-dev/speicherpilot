"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

import styles from "@/components/research/research.module.css";
import { useResearchLayout } from "@/components/research/useResearchLayout";
import { VisionPlot } from "@/components/research/VisionPlot";
import { VisionJahrChartFoot } from "@/components/research/vision-jahr/VisionJahrChartFoot";
import { VisionJahrG2Markt } from "@/components/research/vision-jahr/VisionJahrG2Markt";
import { VisionJahrG3Ueberschuss } from "@/components/research/vision-jahr/VisionJahrG3Ueberschuss";
import { VisionJahrG4Tage } from "@/components/research/vision-jahr/VisionJahrG4Tage";
import { formatVisionGwMinus, formatVisionGwOne, formatVisionPercentWhole } from "@/lib/research/visionJahrFormat";
import { visionJahrUeberschussPct } from "@/lib/research/visionJahrData";
import type { VisionJahrModel } from "@/lib/research/visionJahrTypes";
import type { VisionStageId } from "@/lib/research/researchTypes";
import { formatGwSenkung, GW_MINUS } from "@/lib/research/fleetBasis";

const DURATIONS = [
  { key: "2" as const, label: "2 h" },
  { key: "4" as const, label: "4 h (Sensitivität)" },
];

const VISION_SKIP_KEY = "speicherpilot-vision-guess-skip";

export function VisionPage({ model }: { model: VisionJahrModel }) {
  const reduced = useReducedMotion();
  const layout = useResearchLayout();
  const [duration, setDuration] = useState<"2" | "4">("2");
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
  const durationKey = duration === "2" ? "2" : "4";
  const truth = stage.senkungGw[durationKey];
  const hero = formatGwSenkung(truth);
  const nepC = model.stages2h.find((s) => s.key === "NEP C")!;
  const nepA = model.stages2h.find((s) => s.key === "NEP A")!;
  const inGuess = guessMode && !revealed;
  const showTruth = !inGuess;

  const g2Height = layout.isDesktop ? 420 : 360;
  const g4Height = layout.isDesktop ? 360 : 320;
  const chartWidth = layout.vision.width;

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>VISION · JAHR · 16.11.2025–15.11.2026</p>
      <h1 className={styles.h1}>Was bringt der NEP-Ausbau übers Jahr?</h1>
      <p className={styles.prose}>
        Nationale Kupferplatte, Vollvoraussicht über zwölf Monate (Obergrenze). Spitzenorientiert heißt: die Flotte senkt die{" "}
        <strong> nationale</strong> Jahresspitze der Restlast. Der Oktober-Ausschnitt steht auf{" "}
        <Link href="/monat/2026-10" className={styles.link}>
          /monat/2026-10
        </Link>
        .
      </p>

      <section className={styles.section} aria-labelledby="vision-g1">
        <h2 id="vision-g1" className={styles.h2}>
          Ab NEP A bringt jedes GW wenig
        </h2>
        <p className={styles.meta}>
          Jahresspitze {model.peakGwDisplay} GW ({model.peakTag.replace(/-/g, ".").slice(0, 10)}, {model.peakTime}) · Vorjahr NEP C:{" "}
          {formatVisionGwMinus(model.vorjahr2hSenkung["NEP C"] ?? 0).replace(" GW", "")} bis {formatVisionGwMinus(nepC.senkung2hGw).replace(" GW", "")} GW
        </p>

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
              {stageId.startsWith("nep") ? `NEP ${stage.label} · ` : `${stage.label} · `}
              {stage.powerGw.toFixed(1).replace(".", ",")} GW · {duration === "2" ? "2 h" : "4 h Sensitivität"} · spitzenorientiert (national)
            </p>
          </>
        ) : (
          <>
            <div className={styles.heroNum} aria-hidden>
              ?
            </div>
            <p className={styles.meta}>Wie viel senkt NEP C die Jahresspitze? Erst schätzen — dann die Kurven.</p>
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
            <p className={styles.meta}>Ziehe bei NEP C vertikal — Ziel: {formatVisionGwMinus(nepC.senkung2hGw)}.</p>
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
          width={chartWidth}
          height={layout.vision.height}
          yMax={16}
          ariaLabel="Sättigung Jahressenkung"
          guessStageId="nep-c"
          vorjahr2h={model.stages2h
            .filter((s) => model.vorjahr2hSenkung[s.key] != null)
            .map((s) => ({ powerGw: s.powerGw, senkungGw: model.vorjahr2hSenkung[s.key]! }))}
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
        <VisionJahrChartFoot />

        {inGuess ? (
          <div className={styles.skipWrap}>
            <button type="button" className={styles.skip} onClick={onSkip}>
              Überspringen
            </button>
          </div>
        ) : null}
      </section>

      <section className={styles.section} aria-labelledby="vision-g2">
        <h2 id="vision-g2" className={styles.h2}>
          Nach Preis bleibt die Jahresspitze stehen
        </h2>
        <p className={styles.prose}>
          Selbst mit grober Preisrückwirkung holt der Markt höchstens einen Bruchteil der möglichen Senkung — die graue Linie ohne Rückwirkung ist nur ein gekappter Stresstest.
        </p>
        <VisionJahrG2Markt model={model} width={chartWidth} height={g2Height} />
      </section>

      <section className={styles.section} aria-labelledby="vision-g4">
        <h2 id="vision-g4" className={styles.h2}>
          An {model.tageNepCCount} Tagen fährt selbst NEP C am Limit
        </h2>
        <p className={styles.prose}>
          Fast alle Engpass-Tage liegen zwischen Oktober und März. Am {model.leerTagNepC.replace(/-/g, ".").slice(8, 10)}.{model.leerTagNepC.slice(5, 7)}. ist selbst NEP C leer.
        </p>
        <VisionJahrG4Tage model={model} width={chartWidth} height={g4Height} />
      </section>

      <section className={styles.section} aria-labelledby="vision-g3">
        <h2 id="vision-g3" className={styles.h2}>
          Ab NEP B ist der Überschuss voll
        </h2>
        <p className={styles.prose}>
          Auf Überschuss fahren und Jahresspitze senken ziehen ab NEP A auseinander: NEP A nimmt {formatVisionPercentWhole(visionJahrUeberschussPct("NEP A"))} des Pools, die Spitze sinkt um{" "}
          {formatVisionGwMinus(nepA.senkung2hGw).replace(" GW", "")}.
        </p>
        <VisionJahrG3Ueberschuss model={model} width={chartWidth} />
      </section>

      <footer className={styles.footer}>
        <p>
          National: keine lokalen Engpässe, kein (n-1), kein vermiedener Redispatch, keine vermiedene Abregelung (Überschuss ≠ Abregelung). Wind/PV/Last bis 2037 nicht mitgewachsen — NEP-Speicher im System von heute. Kein Business-Case-Werkzeug.
        </p>
        <p style={{ marginTop: 8 }}>
          <Link href="/methodik#annahmen">Annahmen &amp; Grenzen ↗</Link>
        </p>
        <p style={{ marginTop: 8 }}>Flotte {model.fleetLabel}</p>
        <p style={{ marginTop: 4 }}>Stand {model.stand} · statische Jahresrechnung</p>
      </footer>
    </div>
  );

  function onSkip() {
    window.localStorage.setItem(VISION_SKIP_KEY, "1");
    setRevealed(true);
    setGuessMode(false);
  }
}