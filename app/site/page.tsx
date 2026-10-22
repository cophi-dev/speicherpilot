import { Suspense } from "react";

import { SiteDay } from "@/components/site/SiteDay";

export const metadata = {
  title: "Speicher oder Anschluss",
  description:
    "Standort-Ring für Supermarkt, Quartier und die öffentlichen Eckdaten von Flower in Hamburg-Bergedorf. Die Abendspitze in Kilowatt, die Einschätzung netzdienlich als Schätzung.",
};

export default function SitePage() {
  return (
    <Suspense>
      <SiteDay />
    </Suspense>
  );
}
