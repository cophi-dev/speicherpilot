import { permanentRedirect } from "next/navigation";

import { resolveNavShortcuts } from "@/lib/navShortcuts.server";

/** Must stay a literal and match DAILY_SERIES_REVALIDATE_SECONDS (30 minutes). */
export const revalidate = 1800;

export default async function TagIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[]; x?: string | string[] }>;
}) {
  const query = await searchParams;
  const tagRaw = Array.isArray(query.tag) ? query.tag[0] : query.tag;
  const x = Array.isArray(query.x) ? query.x[0] : query.x;
  const params = new URLSearchParams();
  if (x) {
    params.set("x", x);
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";

  const { lastCompleteDayKey } = await resolveNavShortcuts();

  if (tagRaw && /^\d{4}-\d{2}-\d{2}$/.test(tagRaw)) {
    permanentRedirect(`/tag/${tagRaw}${suffix}`);
  }

  permanentRedirect(`/tag/${lastCompleteDayKey}${suffix}`);
}
