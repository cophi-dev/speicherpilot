import { render, screen } from "@testing-library/react";

import { MarktInsightsBlock } from "@/components/home/MarktInsightsBlock";
import type { MarktInsight } from "@/lib/marktInsights";

const sample: MarktInsight[] = [
  {
    id: "test",
    category: "tag",
    text: "Beispiel-Insight mit Zahl.",
    period: "8.11.",
    source: "SMARD",
    methodikHref: "/methodik#insight-test",
  },
];

describe("MarktInsightsBlock", () => {
  it("renders tag layout like Modell", () => {
    render(<MarktInsightsBlock insights={sample} layout="tag" />);
    expect(document.querySelector(".v4-tagesvorlage-modelbox")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Markt-Insights" })).toHaveStyle({
      fontSize: "var(--type-16)",
    });
  });

  it("renders list and methodik link", () => {
    render(<MarktInsightsBlock insights={sample} />);
    expect(screen.getByTestId("markt-insights")).toBeInTheDocument();
    expect(screen.getByText(/Beispiel-Insight/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alle Regeln" })).toHaveAttribute("href", "/methodik#insights");
  });

  it("renders start layout with only the first insight, Methodik link, and no source/footer", () => {
    const two: MarktInsight[] = [
      ...sample,
      {
        id: "second",
        category: "markt",
        text: "Zweiter Insight.",
        period: "9.11.",
        source: "Energy-Charts",
        methodikHref: "/methodik#insight-second",
      },
    ];
    render(<MarktInsightsBlock insights={two} layout="start" />);
    expect(screen.getByTestId("markt-insights")).toBeInTheDocument();
    expect(screen.getByText(/Beispiel-Insight/)).toBeInTheDocument();
    expect(screen.queryByText(/Zweiter Insight/)).not.toBeInTheDocument();
    expect(screen.queryByText("SMARD")).not.toBeInTheDocument();
    expect(screen.queryByText("8.11.")).not.toBeInTheDocument();
    expect(screen.queryByText(/Feste Schwellen/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Methodik/ })).toHaveAttribute(
      "href",
      "/methodik#insight-test",
    );
  });

  it("returns null for empty", () => {
    const { container } = render(<MarktInsightsBlock insights={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
