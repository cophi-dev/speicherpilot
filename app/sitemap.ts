import type { MetadataRoute } from "next";

import { indexableSitemapEntries } from "@/lib/seo/indexableRoutes";

export default function sitemap(): MetadataRoute.Sitemap {
  return indexableSitemapEntries();
}