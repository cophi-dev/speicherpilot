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
    return "Derselbe Speicher, derselbe Preis, zwei Orte.";
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
          <p className="page-lead v4-subline">
            Ein Speicher an einem Anschlusspunkt: Projektierer sehen Größe und Wirtschaftlichkeit, Netzbetreiber Grenze
            und Netzwirkung.
          </p>
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
          {view === "netz" && scenario !== "grossspeicher" ? (
            <p className="site-netz-principle v4-subline" role="note">
              {CORE}
            </p>
          ) : null}
          {scenario === "grossspeicher" && view === "netz" ? (
            <p className="v4-subline">
              Laden ist Bezug aus dem Netz. Abgeben ist Einspeisung ins Netz. Der Ring unten ist eine Modellschätzung, nicht
              die gemessene Fahrweise.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
