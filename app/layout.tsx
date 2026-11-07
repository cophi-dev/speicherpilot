import type { Metadata, Viewport } from "next";
import "./globals.css";
import { jetbrainsMono, spaceGrotesk } from "@/app/fonts";
import { SiteShell } from "@/components/site-shell";
import { ThemeInitScript } from "@/components/ThemeInitScript";
import { getPublicSiteOrigin } from "@/lib/publicSiteUrl";
import { BUILD_PROVENANCE } from "@/lib/buildProvenance.generated";

const siteOrigin = getPublicSiteOrigin();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: "SpeicherPilot — Speicher und Netz verständlich",
    template: "%s | SpeicherPilot",
  },
  description:
    "SpeicherPilot erklärt Großspeicher, Überschuss und Residuallast mit Live-Daten, Methodik und Szenarien — auf Deutsch.",
  other: {
    "speicherpilot-source-sha": BUILD_PROVENANCE.commit,
    "speicherpilot-build-id": BUILD_PROVENANCE.buildId,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={`${jetbrainsMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeInitScript />
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
