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
    default: "SpeicherPilot — battery storage & grid connection planner",
    template: "%s | SpeicherPilot",
  },
  description:
    "SpeicherPilot — battery storage & grid connection planner. Live 50Hertz wind and solar, DE-LU day-ahead prices, the Germany snapshot, and a labelled storage model.",
  openGraph: {
    title: "SpeicherPilot — battery storage & grid connection planner",
    description:
      "battery storage & grid connection planner. Live 50Hertz wind and solar, DE-LU day-ahead prices, and a labelled storage model.",
    type: "website",
    url: siteOrigin,
    siteName: "SpeicherPilot",
  },
  twitter: {
    card: "summary",
    title: "SpeicherPilot — battery storage & grid connection planner",
    description: "battery storage & grid connection planner — live 50Hertz wind and solar, DE-LU prices.",
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
      className={`${plexSans.variable} ${plexMono.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeInitScript />
        <SiteShell chatConfigured={assessmentChatConfigured()}>{children}</SiteShell>
      </body>
    </html>
  );
}
