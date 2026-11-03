import type { Metadata } from "next";

import { BeitraegePage } from "@/components/beitraege/BeitraegePage";
import { getBlogPosts } from "@/content/blog/posts";

const description = "Artikel zu Großspeichern und kuratierte externe Meldungen.";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Beiträge",
  description,
  alternates: { canonical: "/beitraege" },
  openGraph: {
    title: "Beiträge",
    description,
    images: [],
  },
  twitter: {
    card: "summary",
    title: "Beiträge",
    description,
    images: [],
  },
};

export default function BeitraegeIndexPage() {
  return <BeitraegePage posts={getBlogPosts()} />;
}
