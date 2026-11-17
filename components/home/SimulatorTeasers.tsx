"use client";

import Link from "next/link";

import type { Eps70TeaserUi } from "@/lib/simulatorTeaser.types";

export function StartKompromissTeaser({ teaser }: { teaser: Eps70TeaserUi }) {
  return (
    <section className="v4-chapter" aria-labelledby="kapitel-kompromiss-start">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">{teaser.eyebrowDe}</p>
        <p className="sr-only" lang="en">
          {teaser.eyebrowEn}
        </p>
        <h2 id="kapitel-kompromiss-start" className="v4-chapter-h2">
          {teaser.headlineDe}
        </h2>
        <p className="sr-only" lang="en">
          {teaser.headlineEn}
        </p>
        <p className="v4-subline v4-ort-teaser-subline">{teaser.sublineDe}</p>
        <p className="sr-only" lang="en">
          {teaser.sublineEn}
        </p>
      </div>
      <div className="v4-ort-doors v4-content">
        <Link href="/kompromiss" className="v4-door">
          <span className="v4-door-title">Kompromiss selbst ausprobieren</span>
          <span className="v4-door-label num">→</span>
        </Link>
      </div>
    </section>
  );
}

/** @deprecated Alias für StartKompromissTeaser */
export const StartSimulatorTeaser = StartKompromissTeaser;

export function TagKompromissTeaser({ teaser }: { teaser: Eps70TeaserUi }) {
  return (
    <section className="v4-chapter" aria-labelledby="kapitel-kompromiss-tag">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">Kompromiss · Fahrweisen</p>
        <h2 id="kapitel-kompromiss-tag" className="v4-chapter-h2">
          {teaser.headlineDe}
        </h2>
        <p className="v4-subline v4-ort-teaser-subline">{teaser.sublineDe}</p>
      </div>
      <p className="v4-chapter-foot v4-content num">
        <Link href="/kompromiss" className="v4-text-link">
          im Kompromissrechner selbst ausprobieren →
        </Link>
      </p>
    </section>
  );
}

/** @deprecated Alias für TagKompromissTeaser */
export const TagSimulatorTeaser = TagKompromissTeaser;