import type { Metadata } from "next";

/** Default document title, also used as OG title on the home page. */
export const SITE_TITLE = "SpeicherPilot — Speicher und Netz verständlich";

export const SITE_DESCRIPTION =
  "SpeicherPilot erklärt Großspeicher, Überschuss und Residuallast mit Live-Daten, Methodik und Szenarien — auf Deutsch.";

export const SITE_NAME = "SpeicherPilot";

export const SITE_OG_IMAGE = {
  url: "/og/speicherpilot-og.png",
  width: 1200,
  height: 630,
  alt: "Speicher und Netz verständlich — SpeicherPilot auf Laptop und Smartphone",
} as const;

/** Open Graph + Twitter for a page. Always includes the shared 1200×630 image. */
export function socialMeta(opts: {
  title: string;
  description: string;
  url?: string;
}): Pick<Metadata, "openGraph" | "twitter"> {
  const images = [SITE_OG_IMAGE];
  return {
    openGraph: {
      type: "website",
      locale: "de_DE",
      siteName: SITE_NAME,
      title: opts.title,
      description: opts.description,
      ...(opts.url ? { url: opts.url } : {}),
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images,
    },
  };
}
