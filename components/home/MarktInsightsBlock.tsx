import Link from "next/link";

import styles from "@/components/home/MarktInsightsBlock.module.css";
import type { MarktInsight } from "@/lib/marktInsights";

export function MarktInsightsBlock({
  insights,
  title = "Markt-Insights",
  layout = "legacy",
}: {
  insights: MarktInsight[];
  title?: string;
  /** `tag`: gleiche Optik wie Tagesvorlage „Modell“ auf /tag. */
  layout?: "legacy" | "tag";
}) {
  if (insights.length === 0) {
    return null;
  }

  const list = (
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
  );

  const foot = (
    <p className={`v4-footnote ${styles.foot}`}>
      Feste Schwellen, keine Laufzeit-KI.{" "}
      <Link href="/methodik#insights" className="v4-footnote-link">
        Alle Regeln
      </Link>
    </p>
  );

  if (layout === "tag") {
    return (
      <aside
        className="v4-content v4-tagesvorlage-modelbox v4-markt-insights-tag"
        aria-labelledby="markt-insights-title"
        data-testid="markt-insights"
      >
        <h2 id="markt-insights-title" className="v4-chapter-h2" style={{ fontSize: "var(--type-16)" }}>
          {title}
        </h2>
        {list}
        {foot}
      </aside>
    );
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
      {list}
      {foot}
    </section>
  );
}