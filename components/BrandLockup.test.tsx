import { render, screen } from "@testing-library/react";

import { BrandLockup, HEADER_LOCKUP_HEIGHT, lockupAsset } from "@/components/BrandLockup";

describe("BrandLockup", () => {
  it("exposes one home link and keeps the artwork out of the accessibility tree", () => {
    render(<BrandLockup />);
    const link = screen.getByRole("link", { name: "SpeicherPilot, Startseite" });
    expect(link).toHaveAttribute("href", "/");
    expect(link.textContent).toBe("");
    expect(screen.getAllByRole("link", { name: /SpeicherPilot/ })).toHaveLength(1);

    const images = link.querySelectorAll("img");
    expect(images).toHaveLength(2);
    for (const img of images) {
      expect(img).toHaveAttribute("alt", "");
      expect(img).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("uses the klein lockup at header height and reserves a 0.5 H clear space", () => {
    render(<BrandLockup height={HEADER_LOCKUP_HEIGHT} />);
    const link = screen.getByRole("link", { name: "SpeicherPilot, Startseite" });
    expect(link).toHaveStyle({
      paddingTop: "12px",
      paddingRight: "12px",
      paddingBottom: "12px",
      paddingLeft: "12px",
      marginTop: "-12px",
      marginRight: "-12px",
      marginBottom: "-12px",
      marginLeft: "-12px",
      minHeight: "44px",
      minWidth: "44px",
    });

    expect(link.querySelector(".brand-lockup__hell")).toHaveAttribute("src", "/brand/logo-c-hell-klein.svg");
    expect(link.querySelector(".brand-lockup__dunkel")).toHaveAttribute("src", "/brand/logo-c-dunkel-klein.svg");
    expect(link.querySelector(".brand-lockup__frame")).toHaveStyle({ height: "24px", width: "120.705px" });
  });

  it("switches to the regular lockup at H 32 and clamps below the minimum", () => {
    expect(lockupAsset(31).srcHell).toBe("/brand/logo-c-hell-klein.svg");
    expect(lockupAsset(32).srcHell).toBe("/brand/logo-c-hell.svg");
    expect(lockupAsset(32).srcDunkel).toBe("/brand/logo-c-dunkel.svg");
    expect(lockupAsset(64).height).toBe(64);
    expect(lockupAsset(16).height).toBe(20);
    expect(lockupAsset(16).srcDunkel).toBe("/brand/logo-c-dunkel-klein.svg");
    expect(lockupAsset(24).width).toBeCloseTo((160.94 * 24) / 32);
    expect(lockupAsset(32).width).toBeCloseTo(158.61);
  });
});
