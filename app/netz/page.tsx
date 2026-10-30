import { permanentRedirect } from "next/navigation";

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export default async function NetzRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams({ view: "netz" });
  for (const key of ["fall", "richtung", "knoten", "p"] as const) {
    const value = first(query[key]);
    if (value) {
      params.set(key, value);
    }
  }
  permanentRedirect(`/site?${params.toString()}#testnetz-n1`);
}
