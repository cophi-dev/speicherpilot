import Link from "next/link";

import { sitePath, type Perspective, type ScenarioId } from "@/lib/perspective";

function heroH1(view: Perspective, scenario: ScenarioId): string {
  if (scenario === "grossspeicher") {
    return view === "netz"
      ? "Bollingstedt am 110-kV-Netz von SH Netz."
      : "Großspeicher Bollingstedt am Hochspannungsnetz.";
  }
  if (view === "netz") {
    return scenario === "quartier"
      ? "Abends liegt die Ortsnetzstation über ihrer Planleistung. Der Speicher hält sie darunter."
      : "Abends will der Supermarkt mehr, als sein Anschluss hergibt. Der Speicher hält ihn darunter.";
  }
  return scenario === "quartier"
    ? "Der Speicher an der Ortsnetzstation nimmt die Abendspitze des Quartiers auf."
    : "Eine Stunde Speicher reicht, um die Abendspitze dieses Supermarkts zu kappen.";
}

function kicker(view: Perspective, scenario: ScenarioId): string {
  if (scenario === "grossspeicher") {
    return view === "netz" ? "Netzbetreiber · Hochspannung" : "Standort · öffentliche Referenz";
  }
  return view === "netz" ? "Standort · Szenarien rechnen" : "Standort · Speicher planen";
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
            <Link href={sitePath("netz", scenario)} aria-current={view === "netz" ? "page" : undefined}>
              Netzbetreiber
            </Link>
          </div>
          <p className="v4-kicker num">{kicker(view, scenario)}</p>
          <h1 id="site-hero-title" className="v4-h1">
            {heroH1(view, scenario)}
          </h1>
          {view === "netz" ? (
            <p className="site-netz-principle v4-subline" role="note">
              Speichern von Überschuss ist nicht automatisch netzdienlich — ob ein Speicher entlastet, hängt vom Anschluss
              und von der Fahrweise ab.
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
