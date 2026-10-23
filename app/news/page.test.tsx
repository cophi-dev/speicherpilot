import { render, screen } from "@testing-library/react";

import NewsPage from "@/app/news/page";
import { LanguageContext } from "@/components/language-context";

jest.mock("@/components/NewsPreviewSection", () => ({
  __esModule: true,
  default: () => <div data-testid="news-preview-section">News preview</div>,
}));

describe("News page", () => {
  it("renders the editorial title without the lead line or the ring", () => {
    render(
      <LanguageContext.Provider value={{ language: "de", setLanguage: jest.fn() }}>
        <NewsPage />
      </LanguageContext.Provider>
    );

    expect(
      screen.getByRole("heading", { name: "Was sich im Speichermarkt bewegt, geprüft und mit Quelle." })
    ).toBeInTheDocument();
    expect(screen.getByText("News · geprüft")).toBeInTheDocument();
    expect(screen.queryByText(/Höchstens drei Meldungen/)).toBeNull();
    expect(document.querySelector(".news-ring")).toBeNull();
    expect(document.querySelector(".news-grad")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("news-preview-section")).toBeInTheDocument();
  });
});
