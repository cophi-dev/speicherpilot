"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";

import styles from "@/components/research/research.module.css";
import { SaturationChart, WeekDotsChart } from "@/components/research/charts";
import { MesserHeroChart } from "@/components/research/MesserHeroChart";
import { ResearchSubnav } from "@/components/research/ResearchSubnav";
import { useResearchLayout } from "@/components/research/useResearchLayout";
import type { ResearchFactor, ResearchHomeModel } from "@/lib/research/researchTypes";
import {
  fourHourSensitivityLine,
  heroReductionDisplay,
  researchEyebrowGestern,
  weekDurationFootnote,
  weekRangeLabel,
} from "@/lib/research/researchFormat";

const FACTORS: ResearchFactor[] = [2, 5, 10];

export function ResearchHomePage({ model }: { model: ResearchHomeModel }) {
  const reduced = useReducedMotion();
  const layout = useResearchLayout();
  const [factor, setFactor] = useState<ResearchFactor>(model.day.heroFactor);
  const [weekFactor, setWeekFactor] = useState<ResearchFactor>(2);
  const [weekFourHour, setWeekFourHour] = useState(false);
  const stage = model.day.stages.find((s) => s.factor === factor)!;

  const heroText = useMemo(() => heroReductionDisplay(stage.reductionGw), [stage.reductionGw]);
  const fourh = stage.reduction4hGw;
  const ten = model.day.stages.find((s) => s.factor === 10)!.reductionGw;

  const heroBlock = (
    <>
      <motion.div
        className={styles.heroNum}
        key={`hero-${factor}-${heroText}`}
        initial={reduced ? false : { opacity: 0.55, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { duration: 0.4 }}
        aria-live="polite"
      >
        {heroText}
      </motion.div>
      <p className={styles.meta}>Spitze bei ×{factor} · Modell · national</p>
      <p className={styles.meta}>{fourHourSensitivityLine(fourh, ten, factor)}</p>
      <div className={styles.seg} role="group" aria-label="Flottenstufe">
        {FACTORS.map((f) => (
          <button key={f} type="button" aria-pressed={factor === f} onClick={() => setFactor(f)}>
            ×{f}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className={styles.page}>
      <ResearchSubnav active="gestern" />
      <header className={styles.heroRow}>
        <div>
          <p className={styles.eyebrow}>{researchEyebrowGestern(model.day)}</p>
          <h1 className={styles.h1}>{model.day.h1}</h1>
        </div>
        <div className={styles.heroAside}>{heroBlock}</div>
      </header>

      <div className={styles.chartClip}>
        <MesserHeroChart model={model.day} factor={factor} onFactor={setFactor} width={layout.messer.width} height={layout.messer.height} />
      </div>

      <p className={styles.meta} style={{ marginTop: 6 }}>
        Restlast national · Fläche: gekappt (Modell) · 4-h-Geist: gestrichelt
      </p>

      <div className={styles.lowerSplit}>
        <section id="woche" className={styles.sectionInSplit}>
          <p className={styles.eyebrow}>DIESE WOCHE · {weekRangeLabel(model.week)} · TAGESHORIZONT</p>
          <h2 className={styles.h2}>{model.weekHeadline}</h2>
          <div className={styles.seg} role="group" aria-label="Woche Flottenstufe" style={{ marginTop: 4, marginBottom: 6 }}>
            {FACTORS.map((f) => (
              <button key={f} type="button" aria-pressed={weekFactor === f} onClick={() => setWeekFactor(f)}>
                ×{f}
              </button>
            ))}
          </div>
          <div className={styles.seg} role="group" aria-label="Woche Speicherdauer" style={{ marginTop: 0, marginBottom: 10 }}>
            <button type="button" aria-pressed={!weekFourHour} onClick={() => setWeekFourHour(false)}>
              1,76 h
            </button>
            <button type="button" aria-pressed={weekFourHour} onClick={() => setWeekFourHour(true)}>
              4 h
            </button>
          </div>
          <WeekDotsChart
            week={model.week}
            factor={weekFactor}
            useFourHour={weekFourHour}
            width={layout.week.width}
            height={layout.week.height}
          />
          <p className={styles.meta}>
            Spitzensenkung je Tag, national (Modell) · {weekDurationFootnote}
          </p>
        </section>

        <section className={styles.sectionInSplit}>
          <p className={styles.eyebrow}>SÄTTIGUNG · 12 MONATE · 1,76 h</p>
          <h2 className={styles.h2}>Gestern brachte ab ×5 jedes weitere GW kaum noch etwas.</h2>
          <SaturationChart model={model.day} cloud={model.cloud} width={layout.saturation.width} height={layout.saturation.height} />
          <p className={styles.legendInline}>
            <span>— gestern</span>
            <span>··· gestern 4 h</span>
            <span>--- Median</span>
            <span>▌ P10–P90</span>
          </p>
          <p className={styles.meta}>Wolke: 365 Tage bis {model.day.shortLabel ?? model.day.dateKey} · heutige Flotte · Tageshorizont</p>
          <p style={{ marginTop: 12 }}>
            <Link href="/vision" className={styles.link}>
              In der Vision öffnen →
            </Link>
          </p>
        </section>
      </div>

      <ResearchFoot fleetLabel={model.fleetLabel} />
    </div>
  );
}

function ResearchFoot({ fleetLabel }: { fleetLabel: string }) {
  return (
    <footer className={styles.footer}>
      <p>
        <Link href="/methodik#annahmen">Annahmen &amp; Grenzen ↗</Link>
      </p>
      <p style={{ marginTop: 8 }}>
        Flotte {fleetLabel} · battery-charts.de. Überschuss national, nicht Abregelung. Kein Geschäftsfall, keine Euro auf dieser Ansicht.
      </p>
    </footer>
  );
}
