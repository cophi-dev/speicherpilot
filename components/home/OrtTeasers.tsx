"use client";

import Link from "next/link";

export function StartOrtTeaser() {
  return (
    <section className="v4-chapter" aria-labelledby="kapitel-ort-start">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">03 · Der Ort</p>
        <h2 id="kapitel-ort-start" className="v4-chapter-h2">
          Vom Tagesbogen zum Anschlusspunkt
        </h2>
        <p className="v4-subline">
          Ob Speicher am konkreten Ort dem Netz helfen, hängt von Leistung, Vertrag und Uhrzeit ab — nicht nur vom
          Deutschland-Tag.
        </p>
      </div>
      <div className="v4-ort-doors v4-content">
        <Link href="/ort?sicht=projekt" className="v4-door">
          <span className="v4-door-title">Ich entwickle Speicherprojekte</span>
          <span className="v4-door-label num">→</span>
        </Link>
        <Link href="/ort?sicht=netz" className="v4-door">
          <span className="v4-door-title">Zwei Musterorte vergleichen</span>
          <span className="v4-door-label num">Netz</span>
        </Link>
      </div>
    </section>
  );
}

export function TagOrtTeaser({ dayLabel }: { dayLabel: string }) {
  return (
    <section className="v4-chapter" aria-labelledby="kapitel-ort-tag">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">03 · Der Ort</p>
        <h2 id="kapitel-ort-tag" className="v4-chapter-h2">
          Hätte dieser Tag am Anschluss geholfen?
        </h2>
        <p className="v4-subline">
          Am Ort entscheidet sich, ob Speicher an diesem Tag ({dayLabel}) das Netz entlastet hätten — nicht nur im
          Deutschland-Modell.
        </p>
      </div>
      <p className="v4-chapter-foot v4-content num">
        <Link href="/ort?sicht=netz" className="v4-text-link">
          Netzwirkung vergleichen →
        </Link>
      </p>
    </section>
  );
}
