import Link from "next/link";

import type { MarktInsight } from "@/lib/marktInsights";

export function MonatMarktInsightsDl({ insights, max = 3 }: { insights: MarktInsight[]; max?: number }) {
  const picked = insights.slice(0, max);
  if (picked.length === 0) {
    return null;
  }
  return (
    <dl className="v4-content v4-monat-insights-dl" data-testid="monat-insights-dl">
      {picked.map((item) => (
        <div key={item.id} className="v4-monat-insights-row">
          <dt className="sr-only">{item.id}</dt>
          <dd className="v4-monat-insights-dd">
            {item.text}{" "}
            <Link href={item.methodikHref} className="v4-footnote-link">
              Quelle
            </Link>
          </dd>
        </div>
      ))}
    </dl>
  );
}
