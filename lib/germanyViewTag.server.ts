import "server-only";

import { unstable_cache } from "next/cache";

import {
  assertGermanyViewTagIsrCacheable,
  isGermanyViewNotCacheableError,
} from "@/lib/germanyViewCachePolicy";
import { loadGermanyView } from "@/lib/germanyView";

async function loadGermanyViewForTagCached(datum: string) {
  const view = await loadGermanyView(new Date(), "/tag", { tag: datum });
  assertGermanyViewTagIsrCacheable(view, datum);
  return view;
}

const cachedGermanyViewForTag = (datum: string) =>
  unstable_cache(
    () => loadGermanyViewForTagCached(datum),
    ["germany-view-tag-v3", datum],
    { revalidate: 1800 },
  );

/** Tag-SSR mit ISR (30 min); fehlgeschlagene Ladungen werden nicht eingefroren. */
export async function loadGermanyViewForTag(datum: string) {
  try {
    return await cachedGermanyViewForTag(datum)();
  } catch (error) {
    if (isGermanyViewNotCacheableError(error)) {
      return loadGermanyView(new Date(), "/tag", { tag: datum });
    }
    throw error;
  }
}
