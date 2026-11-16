import { VISION_CHART_FOOTNOTE } from "@/lib/research/visionJahrScope";

import styles from "@/components/research/research.module.css";

export function VisionJahrChartFoot() {
  return <p className={styles.chartScope}>{VISION_CHART_FOOTNOTE}</p>;
}