"use client";

import { Uebersicht } from "@/components/uebersicht/Uebersicht";
import type { OverviewsBundle } from "@/lib/germanyView";

export function MarketingHome({ overviews, until }: { overviews: OverviewsBundle | null; until: string | null }) {
  if (!overviews) {
    return null;
  }
  return <Uebersicht bundle={overviews} until={until} />;
}
