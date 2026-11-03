import { redirect } from "next/navigation";

import { formatBerlinDateKeyFromUtcDate, prevBerlinDateKey } from "@/lib/berlinCalendar";

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

  if (tagRaw && /^\d{4}-\d{2}-\d{2}$/.test(tagRaw)) {
    redirect(`/tag/${tagRaw}${suffix}`);
  }

  const today = formatBerlinDateKeyFromUtcDate(new Date());
  redirect(`/tag/${prevBerlinDateKey(today)}${suffix}`);
}
