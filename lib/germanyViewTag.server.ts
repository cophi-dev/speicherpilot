import "server-only";

import { unstable_cache } from "next/cache";

import { loadGermanyView } from "@/lib/germanyView";

/** Tag-SSR mit ISR (30 min); Live-Pfad unverändert, nur CDN/Server-Cache. */
export function loadGermanyViewForTag(datum: string) {
  return unstable_cache(
    async () => loadGermanyView(new Date(), "/tag", { tag: datum }),
    ["germany-view-tag-v2", datum],
    { revalidate: 1800 },
  )();
}
