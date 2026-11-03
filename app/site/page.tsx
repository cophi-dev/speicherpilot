import { Suspense } from "react";

import { SiteDay } from "@/components/site/SiteDay";
import { loadReferenceParkModelDay } from "@/lib/loadReferenceParkModelDay";
import { parseSelection } from "@/lib/netzDemo";

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export const metadata = {
  title: "Speicher oder Anschluss",
  description: "Zwei Einstiege: Speicher planen oder Szenarien rechnen. Beispiele Supermarkt, Quartier und der Großspeicher Bollingstedt in Schleswig-Holstein.",
};

export default async function SitePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const modelDay = await loadReferenceParkModelDay();
  const netzSelection = parseSelection({
    fall: first(query.fall),
    richtung: first(query.richtung),
    knoten: first(query.knoten),
    p: first(query.p),
  });
  return (
    <Suspense>
      <SiteDay modelDay={modelDay} netzSelection={netzSelection} />
    </Suspense>
  );
}
