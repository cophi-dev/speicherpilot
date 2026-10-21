import { Suspense } from "react";

import { SitePlanner } from "@/components/site/SitePlanner";

export const metadata = {
  title: "Speicher oder Anschluss",
  description: "Zwei Einstiege: Speicher planen oder einen Anschluss prüfen. Beispiele Supermarkt, Quartier und die öffentliche Referenz Flower in Hamburg-Bergedorf.",
};

export default function SitePage() {
  return (
    <Suspense>
      <SitePlanner />
    </Suspense>
  );
}
