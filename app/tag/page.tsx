import { permanentRedirect } from "next/navigation";

import { loadGermanyView } from "@/lib/germanyView";

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

  const view = await loadGermanyView(new Date(), "/tag", {});

  if (tagRaw && /^\d{4}-\d{2}-\d{2}$/.test(tagRaw)) {
    permanentRedirect(`/tag/${tagRaw}${suffix}`);
  }

  permanentRedirect(`/tag/${view.lastCompleteDayKey}${suffix}`);
}
