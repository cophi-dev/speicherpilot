import { permanentRedirect } from "next/navigation";

import { resolveNavShortcuts } from "@/lib/navShortcuts.server";

/** Must stay a literal and match DAILY_SERIES_REVALIDATE_SECONDS (30 minutes). */
export const revalidate = 1800;

export default async function MonatIndexPage() {
  const { monatHref } = await resolveNavShortcuts();
  permanentRedirect(monatHref);
}
