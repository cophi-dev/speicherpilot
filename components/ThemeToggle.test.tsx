import { render, screen } from "@testing-library/react";

import { ThemeToggle } from "@/components/ThemeToggle";

describe("ThemeToggle", () => {
  it("exposes lever lamp control with stateful labels", () => {
    const { rerender } = render(<ThemeToggle isDark={false} mounted onToggle={() => {}} />);
    const btn = screen.getByRole("button", { name: "Helle Darstellung aktiv – zu dunkel wechseln" });
    expect(btn).toHaveAttribute("title", "Helle oder dunkle Darstellung");
    expect(btn).toHaveAttribute("data-state", "light");

    rerender(<ThemeToggle isDark mounted onToggle={() => {}} />);
    expect(
      screen.getByRole("button", { name: "Dunkle Darstellung aktiv – zu hell wechseln" }),
    ).toHaveAttribute("data-state", "dark");
  });
});
