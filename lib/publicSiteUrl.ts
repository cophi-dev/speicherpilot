/**
 * Canonical public origin for OG URLs, share links, sitemap, and robots.
 * Production always uses the registered domain, not the Vercel preview host.
 */
export function getPublicSiteOrigin(): string {
  if (process.env.VERCEL_ENV === "production") {
    return "https://www.speicherpilot.app";
  }
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw).origin;
    } catch {
      /* fall through */
    }
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://127.0.0.1:3000";
}
