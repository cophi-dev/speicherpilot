import { getBlogPost } from "@/content/blog/posts";
import { inlineText } from "@/content/blog/parseArticle";

describe("netz-updates-kw-46", () => {
  const post = getBlogPost("netz-updates-kw-46");

  it("lädt den KW-46-Artikel mit Key Facts, Medien, Charts und Quellen", () => {
    expect(post).toBeDefined();
    if (!post) {
      return;
    }
    expect(post.kind).toBe("netz-updates");
    expect(post.author).toBe("Phillipp Zarindast");
    expect(post.published).toBe("2026-11-16");
    expect(post.sources.map((row) => row.id)).toEqual(["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7"]);
    expect(post.blocks.some((block) => block.type === "keyFacts")).toBe(true);
    expect(post.blocks.some((block) => block.type === "media")).toBe(true);
    expect(post.blocks.filter((block) => block.type === "chart").map((block) => block.chart)).toEqual([
      "netz-updates-duration",
      "netz-updates-fahrweise",
    ]);
    const text = post.blocks
      .flatMap((block) => {
        if (block.type === "p") {
          return inlineText(block.inlines);
        }
        return [];
      })
      .join(" ");
    expect(text).not.toContain("Entwurf, nicht veröffentlicht");
    expect(text).not.toMatch(/Slug-Vorschlag/);
    const cited = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7"];
    const known = new Set(post.sources.map((row) => row.id));
    for (const id of cited) {
      expect(known.has(id)).toBe(true);
    }
  });
});