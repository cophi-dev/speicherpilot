import styles from "@/components/research/research.module.css";
import { ResearchHomeShell } from "@/components/research/ResearchHomeShell.client";
import type { ResearchHomeModel } from "@/lib/research/researchTypes";
import { researchDayEyebrow, researchIncompleteFootnote } from "@/lib/research/researchFormat";

export function ResearchHomePage({ model, simulatorCostPct }: { model: ResearchHomeModel; simulatorCostPct: string }) {
  const headline = (
    <div>
      <p className={styles.eyebrow}>{researchDayEyebrow(model.day, model.dayPerspective)}</p>
      <h1 className={styles.h1}>{model.day.h1}</h1>
      {model.incompleteDayNote ? (
        <p className={styles.prose} style={{ marginTop: 8 }}>
          {researchIncompleteFootnote(model.incompleteDayNote)}
        </p>
      ) : null}
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.heroIntro}>{headline}</div>
      <ResearchHomeShell model={model} simulatorCostPct={simulatorCostPct} />
    </div>
  );
}