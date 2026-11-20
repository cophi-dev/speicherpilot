import type { Metadata } from "next";
import Link from "next/link";

import { socialMeta } from "@/lib/siteOg";

const description =
  "Warum es SpeicherPilot gibt: Offene Datenbasis zwischen Großspeicher-Projektierung und Netzentwicklung — vom nationalen Stromnetz bis zum 80-MW-Umspannwerk.";

export const metadata: Metadata = {
  title: "Über SpeicherPilot",
  description,
  alternates: { canonical: "/ueber" },
  ...socialMeta({ title: "Über SpeicherPilot", description, url: "/ueber" }),
};

export default function UeberPage() {
  return (
    <article className="legal-doc v4-subpage">
      <div className="legal-doc-inner prose">
        <p className="v4-kicker num">ÜBER SPEICHERPILOT</p>
        <h1>Eine gemeinsame Datenbasis für Speicher und Stromnetz</h1>

        <p>
          Im Arbeitsalltag der Hochspannungs- und Umspannwerkskonstruktion begegnen sich zwei Perspektiven auf
          dasselbe Stromnetz: Speicherprojektierer optimieren Großspeicher auf Börsenpreise und Day-Ahead-Spreads,
          während Netzplaner für Gleichzeitigkeit, Rückspeisung und Abendspitzen am Transformator dimensionieren. Beide
          Seiten reden über dieselbe Viertelstunde — aber selten auf derselben, offen nachprüfbaren Zahlenbasis.
        </p>

        <p>
          <strong>SpeicherPilot</strong> schließt genau diese Lücke als privates, unabhängiges Werkzeug. Jede Kurve auf
          dieser Seite basiert auf öffentlichen Viertelstundendaten (Energy-Charts, SMARD, Battery{"\u00A0"}Charts) und
          dokumentierten Optimierungsmodellen — ohne Paywall, ohne Beratungsversprechen und ohne versteckte Annahmen.
        </p>

        <h2>Zwei Modellebenen, ein roter Faden</h2>
        <ul>
          <li>
            <strong>Nationales Netz (Deutschland):</strong>{" "}
            <Link href="/">Tag</Link>, <Link href="/monat/2026-10">Monat</Link> und <Link href="/jahr">Jahr</Link>{" "}
            zeigen den beobachteten Restlast-Verlauf und rechnen eine skalierte nationale Speicherflotte (×1 bis ×10) in
            den Fahrweisen Markt, Überschuss und Spitze.
          </li>
          <li>
            <strong>Kompromiss &amp; Umspannwerk (Simulator):</strong>{" "}
            <Link href="/kompromiss">Kompromiss</Link> misst auf einer 18-Punkte-Pareto-Front, wie viel Day-Ahead-Erlös
            eine echte Spitzensenkung tatsächlich kostet. <Link href="/knoten">Dein Knoten</Link> zoomt auf ein
            typisches 80{"\u00A0"}MW HS/MS-Umspannwerk (2 × 40{"\u00A0"}MVA) und vergleicht reines Preisfahren mit einer
            knotentreuen Fahrweise (§{"\u00A0"}17 Abs.{"\u00A0"}2b EnWG) — inklusive CSV-Export der 96{"\u00A0"}
            Viertelstunden.
          </li>
        </ul>

        <h2>Transparenz &amp; Grenzen</h2>
        <p>
          Alle Formeln, Datenquellen, Flottenkonventionen und bekannten Modellgrenzen (Preisnehmer-Annahme, kein
          Intraday-/Regelleistungsmarkt, keine netztopologische Lastflussrechnung) stehen offen in der{" "}
          <Link href="/methodik">Methodik</Link>. Die Berechnungen dienen der fachlichen Einordnung und ersetzen keine
          Anlagen- oder Netzplanung.
        </p>

        <h2>Kontakt &amp; Austausch</h2>
        <p>
          Hinter SpeicherPilot steht <strong>Phillipp Zarindast</strong> (Hamburg). Fragen, methodische Kritik oder
          Hinweise zu Datenfehlern sind jederzeit willkommen — per E-Mail an{" "}
          <a href="mailto:pzarindast@gmail.com">pzarindast@gmail.com</a> oder direkt über{" "}
          <a href="https://www.linkedin.com/in/phillipp-zarindast/" target="_blank" rel="me noopener">
            LinkedIn
          </a>{" "}
          und{" "}
          <a href="https://x.com/pphhiillliipppp" target="_blank" rel="me noopener">
            X
          </a>
          .
        </p>
      </div>
    </article>
  );
}
