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
  it("renders list and methodik link", () => {
    render(<MarktInsightsBlock insights={sample} />);
    expect(screen.getByTestId("markt-insights")).toBeInTheDocument();
    expect(screen.getByText(/Beispiel-Insight/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alle Regeln" })).toHaveAttribute("href", "/methodik#insights");
  });

  it("returns null for empty", () => {
    const { container } = render(<MarktInsightsBlock insights={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
