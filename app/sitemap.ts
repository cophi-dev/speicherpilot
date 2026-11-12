import type { MetadataRoute } from "next";

import { getPublicSiteOrigin } from "@/lib/publicSiteUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getPublicSiteOrigin();
  const lastModified = new Date();
  return [
    "/",
    "/tag",
    "/monat",
    "/simulator",
    "/methodik",
    "/beitraege",
    "/live",
    "/blog",
    "/impressum",
    "/datenschutz",
  ].map((path) => ({
    url: `${origin}${path}`,
    lastModified,
    changeFrequency: path === "/" || path === "/live" ? "hourly" : "weekly",
    priority: path === "/" ? 1 : path === "/live" ? 0.9 : 0.7,
  }));
}
