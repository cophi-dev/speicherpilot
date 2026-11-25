import { render, screen } from "@testing-library/react";

import { MonatNav } from "@/components/home/MonatPageV4";
import { berlinMonthKeyFromDateKey } from "@/lib/monatCalendar";
import fixture from "@/lib/__fixtures__/auffaelligkeit-records.json";

const records = fixture as import("@/lib/auffaelligkeit").TagesKennzahlRecord[];

describe("MonatNav", () => {
  it("links Oktober 2026 to September 2026 (prev) and November 2026 (next)", () => {
    render(<MonatNav monthKey="2026-10" records={records} />);

    const prevLink = screen.getByRole("link", { name: "← Vormonat" });
    const nextLink = screen.getByRole("link", { name: "Folgemonat →" });

    expect(prevLink).toHaveAttribute("href", "/monat/2026-09");
    expect(nextLink).toHaveAttribute("href", "/monat/2026-11");
    expect(screen.getByRole("link", { name: /Alle 12\s+Monate \(Jahr\) →/ })).toHaveAttribute(
      "href",
      "/jahr#saison-12m",
    );
  });

  it("disables Vormonat on the first available month without falling back to 12-Monats-Übersicht", () => {
    render(<MonatNav monthKey="2026-09" records={records} />);

    expect(screen.queryByRole("link", { name: /Vormonat/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/12-Monats-Übersicht/)).not.toBeInTheDocument();

    const disabledPrev = screen.getByText("← Vormonat");
    expect(disabledPrev.tagName).toBe("SPAN");
    expect(disabledPrev).toHaveClass("v4-tag-nav-btn", "is-disabled");
    expect(disabledPrev).toHaveAttribute("aria-disabled", "true");
    expect(disabledPrev).not.toHaveAttribute("href");

    const nextLink = screen.getByRole("link", { name: "Folgemonat →" });
    expect(nextLink).toHaveAttribute("href", "/monat/2026-10");
  });

  it("links November 2026 back to Oktober 2026 even when only November records are loaded", () => {
    const novOnly = records.filter((r) => berlinMonthKeyFromDateKey(r.dateKey) === "2026-11");
    render(<MonatNav monthKey="2026-11" records={novOnly} />);

    const prevLink = screen.getByRole("link", { name: "← Vormonat" });
    expect(prevLink).toHaveAttribute("href", "/monat/2026-10");

    expect(screen.queryByRole("link", { name: /Folgemonat/ })).not.toBeInTheDocument();
    const disabledNext = screen.getByText("Folgemonat →");
    expect(disabledNext.tagName).toBe("SPAN");
    expect(disabledNext).toHaveClass("v4-tag-nav-btn", "is-disabled");
    expect(disabledNext).toHaveAttribute("aria-disabled", "true");
    expect(disabledNext).not.toHaveAttribute("href");
  });
});
