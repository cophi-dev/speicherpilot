import { permanentRedirect } from "next/navigation";

export default async function LiveRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[]; x?: string | string[] }>;
}) {
  const query = await searchParams;
  const tag = Array.isArray(query.tag) ? query.tag[0] : query.tag;
  const x = Array.isArray(query.x) ? query.x[0] : query.x;
  const params = new URLSearchParams();
  if (x) {
    params.set("x", x);
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  if (tag && /^\d{4}-\d{2}-\d{2}$/.test(tag)) {
    permanentRedirect(`/tag/${tag}${suffix}`);
  }
  permanentRedirect(`/tag${suffix}`);
}
