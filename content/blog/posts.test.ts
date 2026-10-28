import fs from "node:fs";
import path from "node:path";

import { getBlogPost, getBlogPosts } from "@/content/blog/posts";
import { inlineText } from "@/content/blog/parseArticle";

const SLUG = "warum-grossspeicher-das-netz-flexibler-machen";

function stripChunk(chunk: string): string {
  return chunk
    .split("\n")
    .map((line) =>
      line
        .replace(/^>\s?/, "")
        .replace(/^#{1,6}\s+/, "")
        .replace(/^-\s+/, "")
        .replace(/^\d+\.\s+/, "")
        .replace(/^\*(.*)\*$/, "$1")
        .replace(/^---$/, "")
    )
    .join(" ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

describe("blog posts", () => {
  const posts = getBlogPosts();
  const post = getBlogPost(SLUG);
  const markdown = fs.readFileSync(
    path.join(process.cwd(), "content/blog", `${SLUG}.md`),
    "utf8"
  );

  it("publishes the first article from the markdown, with every citation pointing at a source", () => {
    expect(posts.map((entry) => entry.slug)).toEqual([SLUG]);
    expect(post).toBeDefined();
    if (!post) {
      return;
    }
    expect(post.title).toBe("Warum Großspeicher das Netz flexibler machen");
    expect(post.publishedLabel).toBe("28.10.2026");
    expect(post.standLine.startsWith("Stand der Zahlen und Rechtslage: 27.10.2026")).toBe(true);
    expect(post.readingMinutes).toBeGreaterThanOrEqual(6);
    expect(post.readingMinutes).toBeLessThanOrEqual(12);
    expect(post.sources.map((row) => row.id)).toEqual(Array.from({ length: 20 }, (_, index) => `Q${index + 1}`));

    const known = new Set(post.sources.map((row) => row.id));
    const cited = [...markdown.matchAll(/\[(Q\d+(?:\s*,\s*Q\d+)*)\]/g)].flatMap((match) => match[1].split(/\s*,\s*/));
    expect(cited.length).toBeGreaterThan(10);
    for (const id of cited) {
      expect(known.has(id)).toBe(true);
    }
    for (const row of post.sources) {
      expect(row.stand.length).toBeGreaterThan(0);
      expect(row.links.length).toBeGreaterThan(0);
      for (const link of row.links) {
        expect(link.href.startsWith("https://")).toBe(true);
        expect(link.text.length).toBeGreaterThan(2);
      }
    }

    const rendered = [
      post.title,
      post.description,
      post.standLine,
      ...post.blocks.flatMap((block) => {
        if (block.type === "h2") {
          return [block.text];
        }
        if (block.type === "p") {
          return [inlineText(block.inlines)];
        }
        if (block.type === "ul" || block.type === "ol") {
          return block.items.map((item) => inlineText(item));
        }
        if (block.type === "callout") {
          return [block.title, ...block.items.map((item) => inlineText(item)), inlineText(block.question)];
        }
        if (block.type === "sources") {
          return [
            block.intro,
            block.note,
            ...block.rows.flatMap((row) => [row.id, row.quelle, row.stand, ...row.links.map((link) => link.text)]),
          ];
        }
        return [];
      }),
    ].join("\n");
    expect(rendered).not.toContain("ARTIKELTEXT");
    const body = markdown.replace(/<!--[\s\S]*?-->/g, "");
    for (const line of body.split("\n")) {
      if (line.trim() === "" || line.trim() === "---" || line.trim().startsWith("|")) {
        continue;
      }
      const text = stripChunk(line);
      if (!text) {
        continue;
      }
      expect(rendered).toContain(text);
    }
  });
});
