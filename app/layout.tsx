import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { jetbrainsMono, spaceGrotesk } from "@/app/fonts";
import { SiteShell } from "@/components/site-shell";
import { resolveNavShortcuts } from "@/lib/navShortcuts.server";
import { THEME_INIT_SCRIPT, THEME_INIT_SCRIPT_ID } from "@/lib/themeInitInline";
import { getPublicSiteOrigin } from "@/lib/publicSiteUrl";
import { BUILD_PROVENANCE } from "@/lib/buildProvenance.generated";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteGraphJsonLd } from "@/lib/seo/jsonLd";
import { resolveSiteVerification } from "@/lib/seo/siteVerification";
import { SITE_DESCRIPTION, SITE_TITLE, socialMeta } from "@/lib/siteOg";

const siteOrigin = getPublicSiteOrigin();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const verification = resolveSiteVerification();

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: SITE_TITLE,
    template: "%s | SpeicherPilot",
  },
  description: SITE_DESCRIPTION,
  ...(verification ? { verification } : {}),
  ...socialMeta({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
  }),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navShortcuts = await resolveNavShortcuts();
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={`${jetbrainsMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <head>
        <script
          id={THEME_INIT_SCRIPT_ID}
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <JsonLd data={siteGraphJsonLd()} />
        {/* speicherpilot-build:commit=${BUILD_PROVENANCE.commit}:build=${BUILD_PROVENANCE.buildId} */}
        <span
          id="speicherpilot-build-provenance"
          className="sr-only"
          aria-hidden="true"
          data-source-sha={BUILD_PROVENANCE.commit}
          data-build-id={BUILD_PROVENANCE.buildId}
        />
        <SiteShell navShortcuts={navShortcuts}>{children}</SiteShell>
        {/* Cloudflare Web Analytics: cookielos, nur zusammengefasste Seitenaufrufe */}
        <Script
          src="https://static.cloudflareinsights.com/beacon.min.js"
          strategy="afterInteractive"
          data-cf-beacon='{"token":"01cd64ebc563431ab2682356946c2d54"}'
        />
      </body>
    </html>
  );
}
