import type { MetadataRoute } from "next";

import { getPublicSiteOrigin } from "@/lib/publicSiteUrl";

export default function robots(): MetadataRoute.Robots {
  const origin = getPublicSiteOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
