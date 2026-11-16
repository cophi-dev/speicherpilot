import nextConfig from "../next.config";
import sitemap from "@/app/sitemap";
import { loadEps70Teaser } from "@/lib/simulatorTeaser.server";

describe("Simulator-Umbau: Redirects, Sitemap, Kernzahl", () => {
  it("leitet /ort, /site und Unterpfade dauerhaft auf /kompromiss um", async () => {
    const redirects = await nextConfig.redirects!();
    const sources = [
      "/ort",
      "/ort/:path*",
      "/site",
      "/site/:path*",
      "/netz",
      "/szenarien",
    ];
    for (const source of sources) {
      const rule = redirects.find((item) => item.source === source);
      expect(rule).toBeDefined();
      expect(rule!.destination).toBe("/kompromiss");
      expect(rule!.permanent).toBe(true);
    }
  });

  it("nimmt /kompromiss und /jahr in die Sitemap und lässt Redirect-Ziele draußen", () => {
    const urls = sitemap().map((entry) => new URL(entry.url).pathname);
    expect(urls).toContain("/kompromiss");
    expect(urls).toContain("/jahr");
    expect(urls).not.toContain("/simulator");
    expect(urls).not.toContain("/vision");
    expect(urls).not.toContain("/ort");
    expect(urls).not.toContain("/site");
    expect(urls).not.toContain("/live");
    expect(urls).not.toContain("/blog");
  });

  it("liest die Teaser-Kernzahl 0,36 % aus den Daten", () => {
    const teaser = loadEps70Teaser();
    expect(teaser.costLabel).toBe("0,36");
    expect(teaser.costPctText).toBe("0,36\u00A0%");
    expect(teaser.keepLabel).toBe("99,64");
    expect(teaser.sublineDe).toContain("0,89");
    expect(teaser.sublineDe).not.toMatch(/Mio/i);
  });
});
