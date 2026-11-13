import type { Metadata } from "next";

import { socialMeta } from "@/lib/siteOg";
import { notFound } from "next/navigation";

import { BlogArticle } from "@/components/blog/BlogArticle";
import { getBlogPost, getBlogPosts } from "@/content/blog/posts";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return getBlogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) {
    return {};
  }
  const canonical = `/beitraege/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical },
    ...socialMeta({ title: post.title, description: post.description, url: canonical }),
  };
}

export default async function BeitraegeArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) {
    notFound();
  }
  return <BlogArticle post={post} backHref="/beitraege#artikel" backLabel="Beiträge" />;
}
