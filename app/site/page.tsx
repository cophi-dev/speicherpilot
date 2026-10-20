import { Suspense } from "react";

import { SitePlanner } from "@/components/site/SitePlanner";

export const metadata = {
  title: "Standort rechnen",
  description: "Size a battery against a load profile, PV, and a grid connection. Example profiles are synthetic.",
};

export default function SitePage() {
  return (
    <Suspense>
      <SitePlanner />
    </Suspense>
  );
}
