import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { VisionPage } from "@/components/research/VisionPage";
import { buildResearchVision } from "@/lib/research/loadResearchVision.server";
import { VISION_CHART_SCOPE } from "@/lib/research/visionJahrScope";
import { visionJahrCoreDisplayFromJson } from "@/lib/research/visionJahrData";
import nextConfig from "../../next.config";

describe("/jahr Jahresansicht", () => {
  it("zeigt Kernzahlen formatiert aus daten_jahr_v1.json", () => {
    const core = visionJahrCoreDisplayFromJson();
    const model = buildResearchVision();
    expect(model.peakGwDisplay).toBe(core.peakGw);
    expect(model.nepASenkungDisplay).toBe(core.nepASenkung);
    expect(model.nepCSenkungDisplay).toBe(core.nepCSenkung);
    expect(model.tageNepCCount).toBe(core.tageNepC);
  });

  it("enthält kein verbotenes Wort und keine Euro-Zeichen", () => {
    const html = renderToStaticMarkup(createElement(VisionPage, { model: buildResearchVision() }));
    const lower = html.toLowerCase();
    expect(lower).not.toContain("netzdienlich");
    expect(html).not.toMatch(/€/);
    expect(html).not.toMatch(/\bmio\b/i);
  });

  it("trägt den Pflicht-Scope an den Graphen", () => {
    const html = renderToStaticMarkup(createElement(VisionPage, { model: buildResearchVision() }));
    expect(html.split(VISION_CHART_SCOPE).length).toBeGreaterThan(4);
  });

  it("leitet /vision per 308 auf /jahr", async () => {
    const redirects = await nextConfig.redirects!();
    const vision = redirects.find((r) => r.source === "/vision");
    expect(vision).toEqual({ source: "/vision", destination: "/jahr", permanent: true });
    expect(redirects.find((r) => r.source === "/jahr" && r.destination === "/vision")).toBeUndefined();
  });
});