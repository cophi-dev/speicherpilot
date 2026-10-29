import { Suspense } from "react";

import { SiteDay } from "@/components/site/SiteDay";
import { loadReferenceParkModelDay } from "@/lib/loadReferenceParkModelDay";

export const metadata = {
  title: "Speicher oder Anschluss",
  description: "Zwei Einstiege: Speicher planen oder Szenarien rechnen. Beispiele Supermarkt, Quartier und der Großspeicher Bollingstedt in Schleswig-Holstein.",
};

export default async function SitePage() {
  const modelDay = await loadReferenceParkModelDay();
  return (
    <Suspense>
      <SiteDay modelDay={modelDay} />
    </Suspense>
  );
}
