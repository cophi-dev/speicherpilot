import type { Metadata, Viewport } from "next";
import "./globals.css";
import { jetbrainsMono, plexMono, plexSans } from "@/app/fonts";
import { SiteShell } from "@/components/site-shell";
import { ThemeInitScript } from "@/components/ThemeInitScript";
import { assessmentChatConfigured } from "@/lib/llmAvailability";
import { getPublicSiteOrigin } from "@/lib/publicSiteUrl";

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
      className={`${plexSans.variable} ${plexMono.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeInitScript />
        <SiteShell chatConfigured={assessmentChatConfigured()}>{children}</SiteShell>
      </body>
    </html>
  );
}
