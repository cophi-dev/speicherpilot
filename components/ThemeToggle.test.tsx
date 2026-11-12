import { render, screen } from "@testing-library/react";

import { ThemeToggle } from "@/components/ThemeToggle";

describe("ThemeToggle", () => {
  it("exposes light-mode labels and aria-pressed when mounted", () => {
    render(<ThemeToggle isDark={false} mounted onToggle={() => {}} />);
    const btn = screen.getByRole("button", { name: "Helle Darstellung aktiv – zu dunkel wechseln" });
    expect(btn).toHaveAttribute("title", "Helle oder dunkle Darstellung");
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("exposes dark-mode labels and aria-pressed when mounted", () => {
    render(<ThemeToggle isDark mounted onToggle={() => {}} />);
    const btn = screen.getByRole("button", { name: "Dunkle Darstellung aktiv – zu hell wechseln" });
    expect(btn).toHaveAttribute("title", "Helle oder dunkle Darstellung");
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("uses fallback aria-label before mount", () => {
    render(<ThemeToggle isDark={false} mounted={false} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: "Darstellung" })).not.toHaveAttribute("aria-pressed");
  });

  it("assigns unique clipPath ids per instance", () => {
    const { container } = render(
      <>
        <ThemeToggle isDark={false} mounted onToggle={() => {}} />
        <ThemeToggle isDark mounted onToggle={() => {}} />
      </>,
    );
    const clipPaths = container.querySelectorAll("clipPath");
    expect(clipPaths).toHaveLength(2);
    const ids = [...clipPaths].map((node) => node.id);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) {
      expect(container.querySelector(`[clip-path="url(#${id})"]`)).toBeTruthy();
    }
  });
});
