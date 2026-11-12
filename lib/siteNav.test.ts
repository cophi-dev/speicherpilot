import { existsSync } from "node:fs";
import path from "node:path";

import {
  isSiteMainNavActive,
  isSiteMobileExtraNavActive,
  SITE_MAIN_NAV,
  SITE_MAIN_NAV_STATIC_ROUTES,
  SITE_MOBILE_EXTRA_NAV,
} from "@/lib/siteNav";

describe("siteNav", () => {
  it("marks active routes consistently", () => {
    expect(isSiteMainNavActive("/", "/")).toBe(true);
    expect(isSiteMainNavActive("/vision", "/")).toBe(false);
    expect(isSiteMainNavActive("/tag/2026-11-10", "/tag")).toBe(true);
    expect(isSiteMainNavActive("/monat/2026-10", "/monat")).toBe(true);
    expect(isSiteMainNavActive("/methodik", "/methodik")).toBe(true);
    expect(isSiteMainNavActive("/beitraege/foo", "/beitraege")).toBe(true);
  });

  it("marks Woche extra link active only on home hash", () => {
    expect(isSiteMobileExtraNavActive("/", "/#woche", "#woche")).toBe(true);
    expect(isSiteMobileExtraNavActive("/", "/#woche", "")).toBe(false);
    expect(isSiteMobileExtraNavActive("/vision", "/#woche", "#woche")).toBe(false);
  });

  it("maps every main nav href to an app route segment", () => {
    const appRoot = path.join(process.cwd(), "app");
    for (const item of SITE_MAIN_NAV) {
      const segment = item.href === "/" ? "" : item.href.replace(/^\//, "");
      const pageFile = path.join(appRoot, segment, "page.tsx");
      expect(existsSync(pageFile)).toBe(true);
    }
    for (const route of SITE_MAIN_NAV_STATIC_ROUTES) {
      const segment = route === "/" ? "" : route.replace(/^\//, "");
      const pageFile = path.join(appRoot, segment, "page.tsx");
      expect(existsSync(pageFile)).toBe(true);
    }
  });

  it("keeps mobile extra anchors on documented home sections", () => {
    for (const extra of SITE_MOBILE_EXTRA_NAV) {
      expect(extra.href).toMatch(/^\/#/);
      expect(extra.fragment).toBeTruthy();
    }
  });
});
