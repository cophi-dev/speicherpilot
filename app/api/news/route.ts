import { NextResponse } from "next/server";
import { z } from "zod";

import bundledNews from "@/data/news.json";
import { parseNews } from "@/lib/newsFeed";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** The curated file. The page renders that file directly; this route is the same list. */
export function GET(request: Request) {
  const url = new URL(request.url);
  const parsedQuery = querySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        message: "Invalid query parameters",
        errors: parsedQuery.error.flatten(),
      },
      { status: 400 }
    );
  }

  const items = parseNews(bundledNews).slice(0, parsedQuery.data.limit);
  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
