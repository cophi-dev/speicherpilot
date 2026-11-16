import { readFileSync } from "node:fs";
import path from "node:path";

describe("root layout theme init", () => {
  it("inlines the theme script in <head> before <body>", () => {
    const layoutPath = path.join(process.cwd(), "app/layout.tsx");
    const src = readFileSync(layoutPath, "utf8");
    const headOpen = src.indexOf("<head>");
    const headClose = src.indexOf("</head>");
    const bodyOpen = src.indexOf("<body");
    expect(headOpen).toBeGreaterThan(-1);
    expect(headClose).toBeGreaterThan(headOpen);
    expect(bodyOpen).toBeGreaterThan(headClose);

    const head = src.slice(headOpen, headClose);
    expect(head).toContain("id={THEME_INIT_SCRIPT_ID}");
    expect(head).toContain("dangerouslySetInnerHTML");
    expect(head).toContain("__html: THEME_INIT_SCRIPT");
    expect(src).toContain(`from "@/lib/themeInitInline"`);
    expect(src).not.toContain("ThemeInitScript");
    expect(src).not.toMatch(/from "next\/script".*ThemeInit/);
  });
});