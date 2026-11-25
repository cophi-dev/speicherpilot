import { DATEN_DATEIEN, findDatenDatei } from "@/lib/seo/datenDownloads";
import { getPublicSiteOrigin } from "@/lib/publicSiteUrl";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return DATEN_DATEIEN.map((datei) => ({ datei: datei.slug }));
}

export async function GET(_request: Request, context: { params: Promise<{ datei: string }> }) {
  const { datei } = await context.params;
  const eintrag = findDatenDatei(datei);
  if (!eintrag) {
    return new Response("Nicht gefunden", { status: 404 });
  }
  return new Response(eintrag.build(getPublicSiteOrigin()), {
    headers: {
      "Content-Type": eintrag.mime,
      "Content-Disposition": `inline; filename="${eintrag.slug}"`,
      "Cache-Control": "public, max-age=3600",
      Link: '<https://creativecommons.org/licenses/by/4.0/>; rel="license"',
    },
  });
}
