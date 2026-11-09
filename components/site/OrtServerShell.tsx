import Link from "next/link";

import { GROSSSPEICHER_ANKER } from "@/lib/grossspeicherAnker";
import { sitePath, type Perspective, type ScenarioId } from "@/lib/perspective";

const CORE =
  "Netzdienlich ist keine Eigenschaft der Batterie. Es ergibt sich aus Ort, Uhrzeit und Vertrag.";

function heroH1(view: Perspective, scenario: ScenarioId): string {
  if (scenario === "grossspeicher") {
    return view === "netz"
      ? `${GROSSSPEICHER_ANKER.nameDe}.`
      : `${GROSSSPEICHER_ANKER.nameDe}.`;
  }
  if (view === "netz") {
    return CORE;
  }
  return "Ein Schnellladepark will mehr Leistung, als sein Anschluss hergibt.";
}

function kicker(view: Perspective, scenario: ScenarioId): string {
  if (scenario === "grossspeicher") {
    return view === "netz" ? "Netzbetreiber · Hochspannung" : "Standort · Modellanker";
  }
  return view === "netz" ? "Standort · SimBench-Archetypen" : "Standort · Ladepark";
}

export function OrtServerShell({ view, scenario }: { view: Perspective; scenario: ScenarioId }) {
  return (
    <div className="site-v2 ort-hero-shell">
      <section className="v4-subpage-hero ort-hero" aria-labelledby="site-hero-title">
        <div className="ort-v4-copy">
          <p className="v4-kicker num">03 · Der Ort</p>
          {scenario === "grossspeicher" ? (
            <p className="page-lead v4-subline v4-ort-lead-desktop">
              Speicher am Anschlusspunkt — Größe, Grenze, Netzwirkung.
            </p>
          ) : null}
          <div className="v4-tab-bar site-toggle" role="group" aria-label="Perspektive">
            <Link href={sitePath("projekt", scenario)} aria-current={view === "projekt" ? "page" : undefined}>
              Projektierer
            </Link>
            <Link href={sitePath("netz", scenario === "ladepark" ? "land" : scenario)} aria-current={view === "netz" ? "page" : undefined}>
              Netzbetreiber
            </Link>
          </div>
          <p className="v4-kicker num">{kicker(view, scenario)}</p>
          <h1 id="site-hero-title" className="v4-h1">
            {heroH1(view, scenario)}
          </h1>
          {scenario === "grossspeicher" && view === "netz" ? (
            <details className="v4-ort-model-disclosure">
              <summary className="v4-subline">Ring unten: Modellschätzung</summary>
              <p className="v4-subline">
                Laden = Bezug aus dem Netz, Abgeben = Einspeisung. Der Ring ist Modellschätzung, nicht gemessene Fahrweise.
                Lokale Netzwirkung nur durch den Netzbetreiber bewertbar.
              </p>
            </details>
          ) : null}
        </div>
      </section>
    </div>
  );
}
