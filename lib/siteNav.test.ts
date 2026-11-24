import { existsSync, readFileSync } from "node:fs";
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
    expect(isSiteMainNavActive("/", "/tag")).toBe(true);
    expect(isSiteMainNavActive("/tag/2026-11-10", "/tag")).toBe(true);
    expect(isSiteMainNavActive("/jahr", "/jahr")).toBe(true);
    expect(isSiteMainNavActive("/kompromiss", "/jahr")).toBe(false);
    expect(isSiteMainNavActive("/kompromiss", "/kompromiss")).toBe(true);
    expect(isSiteMainNavActive("/simulator", "/kompromiss")).toBe(true);
    expect(isSiteMainNavActive("/simulator/extra", "/kompromiss")).toBe(true);
    expect(isSiteMainNavActive("/knoten", "/kompromiss")).toBe(false);
    expect(isSiteMainNavActive("/knoten", "/knoten")).toBe(true);
    expect(isSiteMainNavActive("/knoten?tag=2026-11-13", "/knoten")).toBe(true);
    expect(isSiteMainNavActive("/methodik", "/kompromiss")).toBe(false);
    expect(isSiteMainNavActive("/monat/2026-10", "/monat")).toBe(true);
    expect(isSiteMainNavActive("/methodik", "/methodik")).toBe(true);
    expect(isSiteMainNavActive("/beitraege/foo", "/beitraege")).toBe(true);
  });

  it("marks Woche extra link active only on home hash when configured", () => {
    if (SITE_MOBILE_EXTRA_NAV.length === 0) {
      expect(isSiteMobileExtraNavActive("/", "/#woche", "#woche")).toBe(false);
      return;
    }
    expect(isSiteMobileExtraNavActive("/", "/#woche", "#woche")).toBe(true);
    expect(isSiteMobileExtraNavActive("/", "/#woche", "")).toBe(false);
    expect(isSiteMobileExtraNavActive("/kompromiss", "/#woche", "#woche")).toBe(false);
  });

  it("maps every main nav href to an app route segment", () => {
    const appRoot = path.join(process.cwd(), "app");
    for (const item of SITE_MAIN_NAV) {
      const segment = item.href.replace(/^\//, "");
      const pageFile = path.join(appRoot, segment, "page.tsx");
      expect(existsSync(pageFile)).toBe(true);
    }
    for (const route of SITE_MAIN_NAV_STATIC_ROUTES) {
      const segment = route === "/" ? "" : route.replace(/^\//, "");
      const pageFile = path.join(appRoot, segment, "page.tsx");
      expect(existsSync(pageFile)).toBe(true);
    }
  });

  it("Hauptnav: Jahr und Simulator (→ /kompromiss), nicht Vision", () => {
    const labels = SITE_MAIN_NAV.map((item) => item.label);
    const hrefs = SITE_MAIN_NAV.map((item) => item.href);
    expect(labels).toContain("Jahr");
    expect(hrefs).toContain("/jahr");
    expect(labels).toContain("Simulator");
    expect(hrefs).toContain("/kompromiss");
    const jahrIdx = labels.indexOf("Jahr");
    const simIdx = labels.indexOf("Simulator");
    expect(jahrIdx).toBeGreaterThanOrEqual(0);
    expect(simIdx).toBe(jahrIdx + 1);
    expect(labels).not.toContain("Vision");
    expect(labels).not.toContain("Gestern");
    expect(hrefs).not.toContain("/vision");
    expect(hrefs).not.toContain("/simulator");
    expect(SITE_MAIN_NAV_STATIC_ROUTES).toContain("/jahr");
    expect(SITE_MAIN_NAV_STATIC_ROUTES).toContain("/kompromiss");
    expect(SITE_MAIN_NAV_STATIC_ROUTES).not.toContain("/vision");
    expect(SITE_MAIN_NAV_STATIC_ROUTES).not.toContain("/simulator");
  });

  it("leitet /simulator permanent auf /kompromiss um", () => {
    const cfg = readFileSync(path.join(process.cwd(), "next.config.ts"), "utf8");
    expect(cfg).toMatch(/source:\s*"\/simulator"/);
    expect(cfg).toMatch(/destination:\s*"\/kompromiss"/);
    expect(cfg).toMatch(/permanent:\s*true/);
  });

  it("keeps mobile extra anchors on documented home sections", () => {
    for (const extra of SITE_MOBILE_EXTRA_NAV) {
      expect(extra.href).toMatch(/^\/#/);
      expect(extra.fragment).toBeTruthy();
    }
  });
});