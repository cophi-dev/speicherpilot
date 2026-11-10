import { ClipFrame } from "@/components/content/ClipFrame";
import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import { buildResearchHome } from "@/lib/research/loadResearchHome.server";
import { loadResearchDays } from "@/lib/research/loadResearchDays.server";
import { buildResearchVision } from "@/lib/research/loadResearchVision.server";

export const dynamic = "force-dynamic";

type ClipId = "gestern" | "woche" | "vision";

export default async function ContentClipPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; t?: string; aspect?: string }>;
}) {
  const sp = await searchParams;
  const id = (sp.id === "woche" || sp.id === "vision" ? sp.id : "gestern") as ClipId;
  const t = Number.parseFloat(sp.t ?? "0") || 0;
  const aspect = sp.aspect === "11" ? "11" : "45";

  const now = new Date();
  const days = await loadResearchDays(now);
  const home = buildResearchHome(days, formatBerlinDateKeyFromUtcDate(now));
  if (!home) return null;
  const vision = buildResearchVision();

  return <ClipFrame id={id} t={t} aspect={aspect} home={home} vision={vision} />;
}
