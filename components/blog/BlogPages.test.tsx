import { render, screen } from "@testing-library/react";

import { BlogArticle } from "@/components/blog/BlogArticle";
import { BlogIndex } from "@/components/blog/BlogIndex";
import { BLOG_FIGURES } from "@/content/blog/figures";
import { getBlogPost, getBlogPosts } from "@/content/blog/posts";

const post = getBlogPost("warum-grossspeicher-das-netz-flexibler-machen");

describe("blog pages", () => {
  if (!post) {
    throw new Error("missing post");
  }
  const article = post;

  it("lists articles newest first with dates and hero images", () => {
    render(<BlogIndex posts={getBlogPosts()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Blog" })).toBeInTheDocument();
    const links = screen.getAllByRole("link").filter((link) => link.getAttribute("href")?.startsWith("/blog/"));
    expect(links[0]).toHaveAttribute("href", "/blog/wann-der-speicher-laden-will");
    expect(links[1]).toHaveAttribute("href", `/blog/${article.slug}`);
    expect(screen.getByText("04.11.2026")).toBeInTheDocument();
    expect(screen.getByText("28.10.2026")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: BLOG_FIGURES.a2.alt })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: BLOG_FIGURES.a1.alt })).toBeInTheDocument();
  });

  it("renders the article wording, figures and source anchors", () => {
    render(<BlogArticle post={article} />);

    const headings = screen.getAllByRole("heading");
    expect(headings[0].tagName).toBe("H1");
    expect(headings[0].textContent).toBe(article.title);
    expect(headings.filter((heading) => heading.tagName === "H1")).toHaveLength(1);
    expect(headings.some((heading) => !["H1", "H2", "H3"].includes(heading.tagName))).toBe(false);
    const h3At = headings.findIndex((heading) => heading.tagName === "H3");
    expect(h3At).toBeGreaterThan(0);
    expect(headings.slice(0, h3At).some((heading) => heading.tagName === "H2")).toBe(true);

    expect(screen.getByText("28.10.2026")).toBeInTheDocument();
    expect(screen.getByText(/Stand der Zahlen und Rechtslage: 27\.10\.2026/)).toBeInTheDocument();
    expect(screen.getByText(/10 bis 90 Prozent \(Modellannahme\)/)).toBeInTheDocument();
    expect(screen.getByText(/85 Prozent an, mit einer Spanne von 80 bis 90 Prozent \(Modellannahme\)/)).toBeInTheDocument();
    expect(screen.getByText(/Modellschätzung, nur Day-Ahead, 2 Stunden/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Was dieser Artikel vereinfacht" })).toBeInTheDocument();
    expect(screen.getByText(/Welche Gegenfrage ein Profi stellen würde/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("ARTIKELTEXT");
    expect(screen.queryByRole("button", { name: /teilen|share/i })).toBeNull();

    expect(screen.getAllByRole("region", { name: "Abbildung, seitlich wischen" })).toHaveLength(2);
    expect(screen.getAllByText("← wischen →")).toHaveLength(4);
    expect(screen.getByRole("img", { name: BLOG_FIGURES.a1.alt }).closest("[role='region']")).toBeNull();
    expect(screen.getByRole("img", { name: BLOG_FIGURES.a1.alt })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: BLOG_FIGURES.b.alt })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: BLOG_FIGURES.c.alt })).toBeInTheDocument();
    for (const image of screen.getAllByRole("img")) {
      expect(image.getAttribute("width")).toBeTruthy();
      expect(image.getAttribute("height")).toBeTruthy();
    }

    const technisch = screen.getByRole("heading", { name: "Was ein Großspeicher technisch ist" });
    const figureB = screen.getByRole("img", { name: BLOG_FIGURES.b.alt });
    expect(technisch.compareDocumentPosition(figureB) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const kannibalisierung = screen.getByText(/Kannibalisierung\./);
    const figureC = screen.getByRole("img", { name: BLOG_FIGURES.c.alt });
    expect(kannibalisierung.compareDocumentPosition(figureC) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    for (const row of article.sources) {
      const anchor = document.getElementById(row.id.toLowerCase());
      expect(anchor?.tagName).toBe("TR");
      for (const link of row.links) {
        const rendered = screen.getByRole("link", { name: link.text });
        expect(rendered).toHaveAttribute("href", link.href);
      }
    }
    const cites = document.querySelectorAll('a[href^="#q"]');
    expect(cites.length).toBeGreaterThan(10);
    for (const cite of cites) {
      const id = cite.getAttribute("href")?.slice(1);
      expect(id).toBeTruthy();
      expect(document.getElementById(id as string)).toBeTruthy();
      expect(cite.getAttribute("aria-label")?.length).toBeGreaterThan(3);
    }
    expect(screen.getByRole("columnheader", { name: "Nr." })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Quelle" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Stand" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Link" })).toBeNull();
  });
});

describe("blog article wann-der-speicher-laden-will", () => {
  const article = getBlogPost("wann-der-speicher-laden-will");
  if (!article) {
    throw new Error("missing post");
  }

  it("renders wording, hero figure and sources without share controls", () => {
    render(<BlogArticle post={article} />);
    expect(screen.getByRole("heading", { level: 1, name: article.title })).toBeInTheDocument();
    expect(screen.getByText(/Stand der Zahlen und Rechtslage: 04\.11\.2026/)).toBeInTheDocument();
    expect(screen.getByText(/218,62 Euro pro Megawattstunde/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Was dieser Beitrag vereinfacht" })).toBeInTheDocument();
    expect(screen.queryByText(/Welche Gegenfrage ein Profi stellen würde/)).toBeNull();
    expect(screen.getByRole("img", { name: BLOG_FIGURES.a2.alt })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /teilen|share/i })).toBeNull();
    expect(screen.queryByRole("region", { name: "Abbildung, seitlich wischen" })).toBeNull();
  });
});
