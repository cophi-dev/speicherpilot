import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { SiteShell } from "@/components/site-shell";
import { ThemeInitScript } from "@/components/ThemeInitScript";
import { getPublicSiteOrigin } from "@/lib/publicSiteUrl";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const siteOrigin = getPublicSiteOrigin();
const xSiteHandle = process.env.NEXT_PUBLIC_X_SITE_HANDLE?.replace(/^@/, "").trim();
const xCreatorHandle =
  process.env.NEXT_PUBLIC_X_CREATOR_HANDLE?.replace(/^@/, "").trim() ?? xSiteHandle;

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
    "SpeicherPilot — battery storage & grid connection planner. Live Germany generation and load from Energy-Charts, storage simulation, and a labelled model estimate.",
  openGraph: {
    title: "SpeicherPilot — battery storage & grid connection planner",
    description:
      "battery storage & grid connection planner. Live Germany power balance from Energy-Charts, with a labelled storage model.",
    type: "website",
    url: siteOrigin,
    siteName: "SpeicherPilot",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpeicherPilot — battery storage & grid connection planner",
    description: "battery storage & grid connection planner — live Germany power balance.",
    ...(xSiteHandle ? { site: `@${xSiteHandle}` as const } : {}),
    ...(xCreatorHandle ? { creator: `@${xCreatorHandle}` as const } : {}),
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
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeInitScript />
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
