import type { MetadataRoute } from "next";

import { indexableSitemapEntries } from "@/lib/seo/indexableRoutes";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return indexableSitemapEntries();
}