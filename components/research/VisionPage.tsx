"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import styles from "@/components/research/research.module.css";
import { ResearchSubnav } from "@/components/research/ResearchSubnav";
import { formatGwSenkung } from "@/lib/research/fleetBasis";
import type { VisionPageModel, VisionStageId } from "@/lib/research/researchTypes";

const DURATIONS = [
  { key: "1.76" as const, label: "1,76 h" },
  { key: "2" as const, label: "2 h" },
  { key: "4" as const, label: "4 h" },
];

const VISION_SKIP_KEY = "speicherpilot-vision-guess-skip";

export function VisionPage({ model }: { model: VisionPageModel }) {
  const [duration, setDuration] = useState<"1.76" | "2" | "4">(model.defaultDuration);
  const [stageId, setStageId] = useState<VisionStageId>(model.defaultStage);
  const [guessMode, setGuessMode] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(VISION_SKIP_KEY) !== "1";
  });
  const [guessGw, setGuessGw] = useState(-12);

  const stage = model.stages.find((s) => s.id === stageId)!;
  const truth = stage.durations[duration];
  const hero = formatGwSenkung(truth);
  const nepLabel = stage.label.length === 1 ? stage.label : null;

  const points = useMemo(
    () =>
      model.stages.map((s) => ({
        id: s.id,
        label: s.label,
        x: s.powerGw,
        y: s.durations[duration],
      })),
    [model.stages, duration]
  );

  return (
    <div className={styles.page}>
      <ResearchSubnav active="vision" />
      <p className={styles.eyebrow}>VISION · {model.monthLabel.toUpperCase()} · MONATSHORIZONT</p>
      <h1 className={styles.h1}>Mehr Gigawatt helfen. Mehr Stunden helfen mehr.</h1>
      <div className={styles.heroNum}>{hero}</div>
      <p className={styles.meta}>
        {nepLabel ? `NEP ${nepLabel} · ` : null}
        {stage.powerGw.toFixed(1).replace(".", ",")} GW · {DURATIONS.find((d) => d.key === duration)?.label} · Modell · national
      </p>
      <p className={styles.meta}>mit 4 h: {formatGwSenkung(stage.durations["4"])}</p>

      <div className={styles.seg} role="group" aria-label="Dauer">
        {DURATIONS.map((d) => (
          <button key={d.key} type="button" aria-pressed={duration === d.key} onClick={() => setDuration(d.key)}>
            {d.label}
          </button>
        ))}
      </div>

      {guessMode ? (
        <div style={{ marginTop: 16 }}>
          <p className={styles.h2}>Erst schätzen, dann sehen</p>
          <label className={styles.meta} htmlFor="vision-guess">
            Wie viel GW Senkung bei NEP B und 2 h?
          </label>
          <input
            id="vision-guess"
            type="range"
            min={-20}
            max={-2}
            step={0.1}
            value={guessGw}
            onChange={(e) => setGuessGw(Number(e.target.value))}
            style={{ width: "100%", margin: "12px 0", minHeight: 44 }}
          />
          <p className={styles.meta}>Deine Schätzung: {formatGwSenkung(Math.abs(guessGw))}</p>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              style={{
                padding: "8px 16px",
                background: "var(--research-accent)",
                color: "#0b0d0f",
                border: 0,
                borderRadius: 18,
                fontWeight: 600,
                minHeight: 44,
              }}
              onClick={() => setGuessMode(false)}
            >
              Auflösen
            </button>
            <button type="button" className={styles.skip} onClick={onSkip}>
              Überspringen
            </button>
          </div>
        </div>
      ) : (
        <VisionChart points={points} activeId={stageId} peakGw={model.peakGw} />
      )}

      <VisionSlider stages={model.stages} stageId={stageId} onStage={setStageId} />

      <p className={styles.meta} style={{ marginTop: 8 }}>
        Ziehen = Stufe · A/B/C = NEP · Spitze {model.peakGw.toFixed(2).replace(".", ",")} GW · Monatshorizont
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
    setGuessMode(false);
  }
}

function VisionChart({
  points,
  activeId,
  peakGw,
}: {
  points: Array<{ id: VisionStageId; label: string; x: number; y: number }>;
  activeId: VisionStageId;
  peakGw: number;
}) {
  const width = 350;
  const height = 240;
  const path = points
    .map((p, i) => {
      const x = 40 + (p.x / 100) * (width - 70);
      const y = 30 + ((-p.y) / 20) * (height - 50);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Vision Sättigung Oktober">
      <path d={path} fill="none" stroke="var(--research-accent)" strokeWidth={2} />
      {points.map((p) => {
        const x = 40 + (p.x / 100) * (width - 70);
        const y = 30 + ((-p.y) / 20) * (height - 50);
        const active = p.id === activeId;
        return <circle key={p.id} cx={x} cy={y} r={active ? 6 : 4} fill={active ? "var(--research-accent)" : "var(--research-fg)"} />;
      })}
      <text x={40} y={height - 8} fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
        0 … 100 GW · Spitze {peakGw.toFixed(2).replace(".", ",")}
      </text>
    </svg>
  );
}

function VisionSlider({
  stages,
  stageId,
  onStage,
}: {
  stages: VisionPageModel["stages"];
  stageId: VisionStageId;
  onStage: (id: VisionStageId) => void;
}) {
  const idx = stages.findIndex((s) => s.id === stageId);
  return (
    <div style={{ marginTop: 8 }}>
      <input
        type="range"
        min={0}
        max={stages.length - 1}
        step={1}
        value={idx}
        onChange={(e) => onStage(stages[Number(e.target.value)]!.id)}
        aria-label="Stufe wählen"
        style={{ width: "100%", minHeight: 44 }}
      />
      <div className={styles.legend}>
        {stages.map((s) => (
          <span key={s.id}>
            {s.label} · {s.powerGw.toFixed(0)} GW
          </span>
        ))}
      </div>
    </div>
  );
}
