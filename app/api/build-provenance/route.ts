import { readFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-static";
export const revalidate = false;

export function GET() {
  const path = join(process.cwd(), "public/build-provenance.json");
  const body = JSON.parse(readFileSync(path, "utf8"));
  return Response.json(body, {
    headers: { "cache-control": "no-store" },
  });
}
