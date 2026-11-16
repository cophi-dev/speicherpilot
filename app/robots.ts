import type { MetadataRoute } from "next";

import { getPublicSiteOrigin } from "@/lib/publicSiteUrl";

const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "PerplexityBot",
  "ClaudeBot",
  "Google-Extended",
  "Bingbot",
] as const;

export default function robots(): MetadataRoute.Robots {
  const origin = getPublicSiteOrigin();
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/" as const })),
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}