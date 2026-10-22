import type { Metadata, Viewport } from "next";
import "./globals.css";
import { jetbrainsMono, plexMono, plexSans } from "@/app/fonts";
import { SiteShell } from "@/components/site-shell";
import { ThemeInitScript } from "@/components/ThemeInitScript";
const siteOrigin = "https://www.speicherpilot.app";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: "SpeicherPilot – Was Batteriespeicher am Netz bewirken",
    template: "%s | SpeicherPilot",
  },
  description:
    "Der Ring zeigt die Residuallast eines Tages und wie Batteriespeicher die Abendspitze glätten. Ein Modell mit veröffentlichten Netzdaten.",
  openGraph: {
    title: "SpeicherPilot – Was Batteriespeicher am Netz bewirken",
    description: "Der Ring zeigt, wie Batteriespeicher die Abendspitze der Residuallast glätten.",
    type: "website",
    url: siteOrigin,
    siteName: "SpeicherPilot",
  },
  twitter: {
    card: "summary",
    title: "SpeicherPilot – Was Batteriespeicher am Netz bewirken",
    description: "Der Ring zeigt, wie Batteriespeicher die Abendspitze der Residuallast glätten.",
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
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
