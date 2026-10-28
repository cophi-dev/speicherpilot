import fs from "node:fs";
import path from "node:path";

import { BLOG_FIGURES, type BlogFigureId } from "@/content/blog/figures";
import {
  insertFigures,
  parseArticleMarkdown,
  readingMinutesFromText,
  readingText,
  type Block,
  type ParsedArticle,
  type SourceRow,
} from "@/content/blog/parseArticle";

export type BlogPost = ParsedArticle & {
  slug: string;
  published: string;
  publishedLabel: string;
  readingMinutes: number;
  blocks: Block[];
  sources: SourceRow[];
};

type PostFile = {
  slug: string;
  file: string;
  published: string;
  publishedLabel: string;
  hero: BlogFigureId;
  inserts: Parameters<typeof insertFigures>[1];
};

/**
 * Further posts: add a markdown file in this folder and an entry here.
 * The markdown is the wording. Publication date and figures are the only extra fields.
 */
const POST_FILES: readonly PostFile[] = [
  {
    slug: "warum-grossspeicher-das-netz-flexibler-machen",
    file: "warum-grossspeicher-das-netz-flexibler-machen.md",
    published: "2026-10-28",
    publishedLabel: "28.10.2026",
    hero: "a1",
    inserts: [
      { kind: "after-list-item", startsWith: "MW und MWh", figure: "b" },
      { kind: "after-paragraph", startsWith: "Zur Einordnung:", figure: "c" },
    ],
  },
];

function loadPost(entry: PostFile): BlogPost {
  const filePath = path.join(process.cwd(), "content/blog", entry.file);
  const markdown = fs.readFileSync(filePath, "utf8");
  const parsed = parseArticleMarkdown(markdown);
  const blocks = insertFigures(parsed.blocks, entry.inserts);
  const article = { ...parsed, blocks };
  const sources = blocks.flatMap((block) => (block.type === "sources" ? block.rows : []));
  if (sources.length === 0) {
    throw new Error(`Beitrag ohne Quellen: ${entry.slug}`);
  }
  return {
    ...article,
    slug: entry.slug,
    published: entry.published,
    publishedLabel: entry.publishedLabel,
    readingMinutes: readingMinutesFromText(
      readingText({ ...article, blocks: article.blocks.filter((block) => block.type !== "sources") })
    ),
    sources,
  };
}

let cache: BlogPost[] | null = null;

export function getBlogPosts(): BlogPost[] {
  if (!cache) {
    cache = POST_FILES.map(loadPost);
  }
  return cache;
}

export function getBlogPost(slug: string): BlogPost | undefined {
  return getBlogPosts().find((post) => post.slug === slug);
}

export function heroFigure(post: BlogPost) {
  const entry = POST_FILES.find((item) => item.slug === post.slug);
  if (!entry) {
    throw new Error(`Beitrag ohne Titelbild: ${post.slug}`);
  }
  return BLOG_FIGURES[entry.hero];
}

export function readingLabel(minutes: number): string {
  return `${minutes} Min. Lesezeit`;
}
