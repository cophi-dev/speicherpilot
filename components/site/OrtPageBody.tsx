"use client";

import Link from "next/link";

import { OrtArchetypen } from "@/components/site/OrtArchetypen";
import { OrtProjektLadepark } from "@/components/site/OrtProjektLadepark";
import { useLanguage } from "@/components/language-context";
import type { NetzSelection } from "@/lib/netzDemo";
import { sitePath, type Perspective, type ScenarioId } from "@/lib/perspective";
import type { ReferenceParkModelDay } from "@/lib/referenceParkModelDay";

function ExampleCards({ view, scenario }: { view: Perspective; scenario: ScenarioId }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const cards: Array<{ id: ScenarioId; title: string; body: string; views: Perspective[] }> = [
    {
      id: "ladepark",
      title: tx("Schnellladepark", "Fast-charging hub"),
      body: tx("Projektierer · Peak und Wirtschaftlichkeit", "Developer · peak and economics"),
      views: ["projekt"],
    },
    {
      id: "land",
      title: tx("Ländlicher Netzknoten", "Rural grid node"),
      body: tx("Wind und PV · Einspeisung mittags", "Wind and PV · midday feed-in"),
      views: ["netz"],
    },
    {
      id: "stadt",
      title: tx("Stadtnetz-Knoten", "Urban grid node"),
      body: tx("Bezug abends · Laden zählt mit", "Evening withdrawal · charging counts"),
      views: ["netz"],
    },
    {
      id: "grossspeicher",
      title: tx("Großspeicher 110 kV", "110 kV large storage"),
      body: tx("Grenze und Erlös · Modell", "Limit and revenue · model"),
      views: ["projekt", "netz"],
    },
  ];
  return (
    <section className="day-paper">
      <div className="day-hero-inner">
        <h2>{tx("Beispiele", "Examples")}</h2>
        <ul className="site-examples">
          {cards
            .filter((c) => c.views.includes(view))
            .map((card) => (
              <li key={card.id}>
                <Link href={sitePath(view, card.id)} aria-current={scenario === card.id ? "page" : undefined}>
                  <span className="site-example-title">{card.title}</span>
                  <span>{card.body}</span>
                </Link>
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
}

export function OrtPageBody({
  view,
  scenario,
  netzSelection,
}: {
  view: Perspective;
  scenario: ScenarioId;
  modelDay: ReferenceParkModelDay | null;
  netzSelection: NetzSelection;
}) {
  if (view === "projekt") {
    return (
      <>
        <OrtProjektLadepark />
        <ExampleCards view={view} scenario={scenario} />
      </>
    );
  }
  const archetype = scenario === "stadt" ? "stadt" : "land";
  void netzSelection;
  return <OrtArchetypen initialArchetype={archetype} />;
}
