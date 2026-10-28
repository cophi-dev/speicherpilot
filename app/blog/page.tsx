import type { Metadata } from "next";

import { BlogIndex } from "@/components/blog/BlogIndex";
import { getBlogPosts } from "@/content/blog/posts";

const description = "Texte von SpeicherPilot zu Großspeichern, dem Netz und dem Markt.";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Blog",
  description,
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog",
    description,
    images: [],
  },
  twitter: {
    card: "summary",
    title: "Blog",
    description,
    images: [],
  },
};

export default function BlogPage() {
  return <BlogIndex posts={getBlogPosts()} />;
}
