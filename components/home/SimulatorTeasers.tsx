"use client";

import Link from "next/link";

export function StartSimulatorTeaser({ costPctText }: { costPctText: string }) {
  return (
    <section className="v4-chapter" aria-labelledby="kapitel-simulator-start">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">Simulator · Fahrweisen</p>
        <h2 id="kapitel-simulator-start" className="v4-chapter-h2">
          70 Prozent der Monatssenkung kosten {costPctText} des Erlöses (ε-70)
        </h2>
        <p className="v4-subline v4-ort-teaser-subline">Flotte ×2, Modellschätzung, national, kein Netzengpass.</p>
      </div>
      <div className="v4-ort-doors v4-content">
        <Link href="/simulator" className="v4-door">
          <span className="v4-door-title">Im Simulator selbst ausprobieren</span>
          <span className="v4-door-label num">→</span>
        </Link>
      </div>
    </section>
  );
}

export function TagSimulatorTeaser({ costPctText }: { costPctText: string }) {
  return (
    <section className="v4-chapter" aria-labelledby="kapitel-simulator-tag">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">Simulator · Fahrweisen</p>
        <h2 id="kapitel-simulator-tag" className="v4-chapter-h2">
          70 Prozent der Monatssenkung kosten {costPctText} des Erlöses (ε-70)
        </h2>
        <p className="v4-subline v4-ort-teaser-subline">Flotte ×2, Modellschätzung — auf der Monatsfront nachrechnen.</p>
      </div>
      <p className="v4-chapter-foot v4-content num">
        <Link href="/simulator" className="v4-text-link">
          im Simulator selbst ausprobieren →
        </Link>
      </p>
    </section>
  );
}
