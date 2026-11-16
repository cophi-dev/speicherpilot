import type { Metadata } from "next";

import { socialMeta } from "@/lib/siteOg";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/JsonLd";
import { articleJsonLd } from "@/lib/seo/jsonLd";
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
  const ogImage = post.ogImagePath
    ? {
        url: post.ogImagePath,
        width: 1080,
        height: 1350,
        alt: post.title,
      }
    : undefined;
  const social = socialMeta({ title: post.title, description: post.description, url: canonical });
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical },
    ...social,
    openGraph: {
      ...social.openGraph,
      type: "article",
      publishedTime: post.published,
      authors: post.author ? [post.author] : undefined,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    twitter: {
      ...social.twitter,
      ...(ogImage ? { images: [ogImage.url] } : {}),
    },
  };
}

export default async function BeitraegeArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) {
    notFound();
  }
  const articleLd = articleJsonLd(post);
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", ...articleLd }} />
      <BlogArticle post={post} backHref="/beitraege#artikel" backLabel="Beiträge" />
    </>
  );
}
