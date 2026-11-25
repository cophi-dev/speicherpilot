import styles from "@/components/research/research.module.css";
import { VISION_METHODIK_ANCHOR } from "@/lib/research/visionJahrKernsatz";

export function VisionJahrKernsatzBlock({ paragraph }: { paragraph: string }) {
  return (
    <p className={styles.kernsatz} id="vision-kernsatz">
      {paragraph}{" "}
      {/* Volles Laden statt next/link: MethodikHashScroll öffnet den zugeklappten Abschnitt nur beim Seitenaufruf. */}
      <a href={`/methodik#${VISION_METHODIK_ANCHOR}`} className={styles.link}>
        Methodik →
      </a>
    </p>
  );
}