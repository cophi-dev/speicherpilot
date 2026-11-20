"use client";

import Link from "next/link";

import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import type { Eps70TeaserUi } from "@/lib/simulatorTeaser.types";

/**
 * 2-Ebenen-Kompass auf der Startseite: verbindet die nationale Bilanz (Tag · Monat · Jahr)
 * mit der Netzanschluss- und Fahrweisen-Werkbank (Kompromiss · Knoten).
 */
export function StartRoterFadenKompass() {
  return (
    <section className="v4-chapter" aria-labelledby="kapitel-roter-faden-start" data-testid="start-roter-faden">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">Überblick · Zwei Ebenen im Modell</p>
        <h2 id="kapitel-roter-faden-start" className="v4-chapter-h2">
          Nationale Bilanz (Tag · Monat · Jahr) und Umspannwerk-Grenze (Kompromiss · Knoten)
        </h2>
        <p className="v4-subline v4-ort-teaser-subline">
          {insertDisplayUnitNbsp(
            "Unten folgt der gestrige Systemtag. Für Auslegung, Speicherdauer (1,76 h vs. 4 h) und flexible Netzanschlussvereinbarungen (§ 17 Abs. 2b EnWG) führen drei Werkzeuge direkt in die Modellläufe:",
          )}
        </p>
      </div>
      <div className="v4-kompass-grid v4-content">
        <article className="v4-kompass-card">
          <p className="v4-kompass-kicker num">1 · Speicherdauer &amp; Flotte (National)</p>
          <p className="v4-kompass-body">
            {insertDisplayUnitNbsp(
              "×5 mit 4 h senkt die Oktober-Spitze genauso stark wie ×10 mit 1,76 h (−14,0 GW bei halber Leistung).",
            )}
          </p>
          <Link href="/monat/2026-10" className="v4-text-link v4-kompass-link">
            Monatsmodell →
          </Link>
        </article>
        <article className="v4-kompass-card">
          <p className="v4-kompass-kicker num">2 · Fahrweise &amp; Leistungsdeckel (Pareto)</p>
          <p className="v4-kompass-body">
            {insertDisplayUnitNbsp(
              "70 % der maximalen Spitzensenkung (2,51 statt 0,37 GW) kosten bei doppelter Flotte nur 0,36 % Day-Ahead-Erlös.",
            )}
          </p>
          <Link href="/kompromiss" className="v4-text-link v4-kompass-link">
            Kompromiss →
          </Link>
        </article>
        <article className="v4-kompass-card">
          <p className="v4-kompass-kicker num">3 · Umspannwerk-Grenze (80{"\u00A0"}MW)</p>
          <p className="v4-kompass-body">
            {insertDisplayUnitNbsp(
              "Drei Modellknoten (Wind Nord, Solar Süd, Stadt): wo Markt-Laden die Grenze reißt und was knotentreu kostet.",
            )}
          </p>
          <Link href="/knoten" className="v4-text-link v4-kompass-link">
            Modellknoten →
          </Link>
        </article>
      </div>
    </section>
  );
}

export function StartKompromissTeaser({ teaser }: { teaser: Eps70TeaserUi }) {
  return (
    <section className="v4-chapter" aria-labelledby="kapitel-kompromiss-start">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">{teaser.eyebrowDe}</p>
        <h2 id="kapitel-kompromiss-start" className="v4-chapter-h2">
          {teaser.headlineDe}
        </h2>
        <p className="v4-subline v4-ort-teaser-subline">{teaser.sublineDe}</p>
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

/** Knoten-Befund auf der Startseite (Phillipp 20.11.2026), gleiche Optik wie der Kompromiss-Teaser. */
export function StartKnotenTeaser() {
  return (
    <section className="v4-chapter" aria-labelledby="kapitel-knoten-start">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">Knoten · Windknoten Nord · 24.10.2026</p>
        <h2 id="kapitel-knoten-start" className="v4-chapter-h2">
          Doppelte Flotte am Windknoten Nord: nach Marktpreis 6{"\u00A0"}Viertelstunden über der Grenze, knotentreu 0.
        </h2>
        <p className="v4-subline v4-ort-teaser-subline">
          Knotentreu gefahren kostet das 0,4{"\u00A0"}% Day-Ahead-Erlös (Modell, perfekte Voraussicht).
        </p>
      </div>
      <div className="v4-ort-doors v4-content">
        <Link href="/knoten" className="v4-door">
          <span className="v4-door-title">Knoten selbst ansehen</span>
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