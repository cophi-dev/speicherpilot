import Link from "next/link";

import styles from "@/components/home/MarktInsightsBlock.module.css";
import type { MarktInsight } from "@/lib/marktInsights";

export function MarktInsightsBlock({
  insights,
  title = "Markt-Insights",
}: {
  insights: MarktInsight[];
  title?: string;
}) {
  if (insights.length === 0) {
    return null;
  }

  return (
    <section
      className={`v4-content v4-markt-insights ${styles.block}`}
      aria-labelledby="markt-insights-title"
      data-testid="markt-insights"
    >
      <h2 id="markt-insights-title" className={styles.title}>
        {title}
      </h2>
      <ul className={styles.list}>
        {insights.map((item) => (
          <li key={item.id} className={styles.item}>
            <p className={styles.text}>{item.text}</p>
            <p className={`${styles.meta} num`}>
              <span>{item.period}</span>
              <span className={styles.sep} aria-hidden="true">
                ·
              </span>
              <span>{item.source}</span>
              <span className={styles.sep} aria-hidden="true">
                ·
              </span>
              <Link href={item.methodikHref} className="v4-footnote-link markt-insights-regel-link">
                Regel
              </Link>
            </p>
          </li>
        ))}
      </ul>
      <p className={`v4-footnote ${styles.foot}`}>
        Feste Schwellen, keine Laufzeit-KI.{" "}
        <Link href="/methodik#insights" className="v4-footnote-link">
          Alle Regeln
        </Link>
      </p>
    </section>
  );
}
