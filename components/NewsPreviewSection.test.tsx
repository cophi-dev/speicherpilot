import { render, screen, waitFor } from "@testing-library/react";

import NewsPreviewSection from "@/components/NewsPreviewSection";
import { LanguageContext } from "@/components/language-context";
import bundledNews from "@/data/news.json";

const renderWithLanguage = (language: "en" | "de" = "en") =>
  render(
    <LanguageContext.Provider value={{ language, setLanguage: jest.fn() }}>
      <NewsPreviewSection />
    </LanguageContext.Provider>
  );

describe("NewsPreviewSection", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("renders loaded items", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        asOfIso: "2026-05-08T10:00:00.000Z",
        itemCount: 1,
        items: [
          {
            id: "n1",
            title: "Germany BESS regulation updated",
            summary: "A concise summary.",
            sourceName: "News Source",
            url: "https://example.com/item",
            publishedAtIso: "2026-05-08T08:00:00.000Z",
            categories: ["germany", "regulation"],
            relevanceScore: 88,
          },
        ],
      }),
    }) as typeof fetch;

    renderWithLanguage();
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /Germany BESS regulation updated/i })).toBeInTheDocument()
    );
    expect(screen.getByText(/A concise summary/i)).toBeInTheDocument();
  });

  it("hides a teaser that repeats the title", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        asOfIso: "2026-05-08T10:00:00.000Z",
        itemCount: 1,
        items: [
          {
            id: "n2",
            title: "Same line",
            summary: "Same   line",
            sourceName: "News Source",
            url: "https://example.com/same",
            publishedAtIso: "2026-05-08T08:00:00.000Z",
            categories: ["germany"],
            relevanceScore: 70,
          },
        ],
      }),
    }) as typeof fetch;

    renderWithLanguage();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Same line" })).toBeInTheDocument());
    expect(screen.getAllByText("Same line")).toHaveLength(1);
  });

  it("does not show a literal non-breaking-space entity before the source", async () => {
    expect(JSON.stringify(bundledNews)).not.toContain("&nbsp;");
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        asOfIso: "2026-05-08T10:00:00.000Z",
        itemCount: 1,
        items: [
          {
            id: "n3",
            title: "Germany battery storage project - pv magazine",
            summary: "Germany battery storage project &nbsp;&nbsp; pv magazine",
            sourceName: "&nbsp;&nbsp;pv magazine",
            url: "https://example.com/nbsp",
            publishedAtIso: "2026-05-08T08:00:00.000Z",
            categories: ["germany"],
            relevanceScore: 80,
          },
        ],
      }),
    }) as typeof fetch;

    renderWithLanguage();
    await waitFor(() => expect(screen.getByRole("heading", { name: /Germany battery storage project/i })).toBeInTheDocument());
    expect(document.body.textContent).not.toContain("&nbsp;");
    expect(document.querySelector(".news-source")?.textContent).toBe("pv magazine");
  });

  it("hides a teaser that matches the title after the source suffix is removed", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        asOfIso: "2026-05-08T10:00:00.000Z",
        itemCount: 1,
        items: [
          {
            id: "n4",
            title: "Speicher am Netz - pv magazine",
            summary: "Speicher am Netz",
            sourceName: "pv magazine",
            url: "https://example.com/suffix",
            publishedAtIso: "2026-05-08T08:00:00.000Z",
            categories: ["germany"],
            relevanceScore: 80,
          },
        ],
      }),
    }) as typeof fetch;

    renderWithLanguage();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Speicher am Netz - pv magazine" })).toBeInTheDocument());
    expect(screen.queryByText("Speicher am Netz")).not.toBeInTheDocument();
    expect(document.querySelector(".news-source")?.textContent).toBe("pv magazine");
  });

  it("renders error state", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: "failed" }),
    }) as typeof fetch;

    renderWithLanguage("de");
    await waitFor(() =>
      expect(screen.getByText(/Newsfeed ist gerade nicht erreichbar/i)).toBeInTheDocument()
    );
  });
});
