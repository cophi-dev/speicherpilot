import { notFound } from "next/navigation";

import { TagPageLaufend } from "@/components/home/TagPageLaufend";
import { liveTagFixtureDemoEnabled, loadLiveTagFixtureView } from "@/lib/loadLiveTagFixtureView.server";

export const dynamic = "force-dynamic";

export default async function LiveTagFixtureDemoPage() {
  if (!liveTagFixtureDemoEnabled()) {
    notFound();
  }
  const view = await loadLiveTagFixtureView();
  return <TagPageLaufend view={view} />;
}