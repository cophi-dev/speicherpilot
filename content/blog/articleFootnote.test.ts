import { formatArticleFootnote } from "@/content/blog/articleFootnote";

describe("formatArticleFootnote", () => {
  it("formatiert Stand, Klammer-Hinweis und Scope", () => {
    expect(
      formatArticleFootnote({
        stand: "16.11.2026",
        citeHint: "Quellen in eckigen Klammern",
        scope: "Gemeint sind Batterie-Großspeicher",
      }),
    ).toBe("Stand: 16.11.2026. Quellen in eckigen Klammern. Gemeint sind Batterie-Großspeicher.");
  });
});