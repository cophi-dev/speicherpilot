import { redirect } from "next/navigation";

export default async function SiteRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams();
  const view = typeof query.view === "string" ? query.view : Array.isArray(query.view) ? query.view[0] : null;
  const sicht = view === "netz" ? "netz" : "projekt";
  params.set("sicht", sicht);
  if (query.scenario) {
    const scenario = Array.isArray(query.scenario) ? query.scenario[0] : query.scenario;
    if (scenario) {
      params.set("scenario", scenario);
    }
  }
  for (const key of ["fall", "richtung", "knoten", "p"] as const) {
    const v = query[key];
    if (typeof v === "string") {
      params.set(key, v);
    }
  }
  const hash = typeof query === "object" ? "" : "";
  redirect(`/ort?${params.toString()}${hash}`);
}
