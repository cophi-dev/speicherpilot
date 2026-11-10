"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import styles from "@/components/research/research.module.css";
import { ResidualMesserChart, SaturationChart, WeekDotsChart } from "@/components/research/charts";
import { ResearchSubnav } from "@/components/research/ResearchSubnav";
import { formatGwSenkung } from "@/lib/research/fleetBasis";
import type { ResearchFactor, ResearchHomeModel } from "@/lib/research/researchTypes";
import { heroReductionDisplay, researchEyebrowGestern, weekRangeLabel } from "@/lib/research/researchFormat";

const FACTORS: ResearchFactor[] = [2, 5, 10];

export function ResearchHomePage({ model }: { model: ResearchHomeModel }) {
  const [factor, setFactor] = useState<ResearchFactor>(model.day.heroFactor);
  const stage = model.day.stages.find((s) => s.factor === factor)!;

  const heroText = useMemo(() => heroReductionDisplay(stage.reductionGw), [stage.reductionGw]);
  const fourh = stage.reduction4hGw;
  const ten = model.day.stages.find((s) => s.factor === 10)!.reductionGw;

  return (
    <div className={styles.page}>
      <ResearchSubnav active="gestern" />
      <header>
        <p className={styles.eyebrow}>{researchEyebrowGestern(model.day)}</p>
        <h1 className={styles.h1}>{model.day.h1}</h1>
        <div className={styles.heroNum} aria-live="polite">
          {heroText}
        </div>
        <p className={styles.meta}>Spitze bei ×{factor} · Modell · national</p>
        <p className={styles.meta}>
          mit 4 h: {formatGwSenkung(fourh)}
          {fourh > ten - 0.01 ? `, mehr als ×10 (${formatGwSenkung(ten).replace("−", "")})` : null}
        </p>
        <div className={styles.seg} role="group" aria-label="Flottenstufe">
          {FACTORS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={factor === f}
              onClick={() => setFactor(f)}
            >
              ×{f}
            </button>
          ))}
        </div>
      </header>

      <ResidualMesserChart model={model.day} factor={factor} />

      <p className={styles.meta} style={{ marginTop: 6 }}>
        Restlast national · Fläche: gekappt (Modell)
      </p>

      <section id="woche" className={styles.section}>
        <p className={styles.eyebrow}>DIESE WOCHE · {weekRangeLabel(model.week)} · TAGESHORIZONT</p>
        <h2 className={styles.h2}>{model.weekHeadline}</h2>
        <div className={styles.legend}>
          <span>○ 1,76 h: Energie leer</span>
          <span>— 4 h</span>
          <span>■ 4 h: GW fehlen</span>
          <span>= Tagesgrenze</span>
        </div>
        <WeekDotsChart week={model.week} />
        <p className={styles.meta}>Spitzensenkung je Tag, national (Modell)</p>
      </section>

      <section className={styles.section}>
        <div className={styles.split}>
          <div>
            <p className={styles.eyebrow}>SÄTTIGUNG · 12 MONATE · 1,76 h</p>
            <h2 className={styles.h2}>Gestern brachte ab ×5 jedes weitere GW kaum noch etwas.</h2>
            <SaturationChart model={model.day} cloud={model.cloud} />
            <p className={styles.meta}>Wolke: 365 Tage bis {model.day.shortLabel ?? model.day.dateKey} · heutige Flotte · Tageshorizont</p>
            <p style={{ marginTop: 12 }}>
              <Link href="/vision" className={styles.link}>
                In der Vision öffnen →
              </Link>
            </p>
          </div>
        </div>
      </section>

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
