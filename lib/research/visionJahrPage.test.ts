import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { VisionPage } from "@/components/research/VisionPage";
import { buildResearchVision } from "@/lib/research/loadResearchVision.server";
import { buildVisionJahrKernsatz } from "@/lib/research/visionJahrKernsatz";
import { VISION_CHART_SCOPE } from "@/lib/research/visionJahrScope";
import { visionJahrCoreDisplayFromJson } from "@/lib/research/visionJahrData";
import nextConfig from "../../next.config";

describe("/vision Jahresansicht", () => {
  it("zeigt Kernzahlen formatiert aus daten_jahr_v1.json", () => {
    const core = visionJahrCoreDisplayFromJson();
    const model = buildResearchVision();
    expect(model.peakGwDisplay).toBe(core.peakGw);
    expect(model.nepASenkungDisplay).toBe(core.nepASenkung);
    expect(model.nepCSenkungDisplay).toBe(core.nepCSenkung);
    expect(model.tageNepCCount).toBe(core.tageNepC);
  });

  it("enthält kein verbotenes Wort und keine Euro-Zeichen", () => {
    const html = renderToStaticMarkup(
      createElement(VisionPage, { model: buildResearchVision(), kernsatz: buildVisionJahrKernsatz().paragraph })
    );
    const lower = html.toLowerCase();
    expect(lower).not.toContain("netzdienlich");
    expect(html).not.toMatch(/€/);
    expect(html).not.toMatch(/\bmio\b/i);
  });

  it("trägt den Pflicht-Scope an den Graphen", () => {
    const html = renderToStaticMarkup(
      createElement(VisionPage, { model: buildResearchVision(), kernsatz: buildVisionJahrKernsatz().paragraph })
    );
    expect(html.split(VISION_CHART_SCOPE).length).toBeGreaterThan(4);
  });

  it("leitet /jahr per 308 auf /vision", async () => {
    const redirects = await nextConfig.redirects!();
    const jahr = redirects.find((r) => r.source === "/jahr");
    expect(jahr).toEqual({ source: "/jahr", destination: "/vision", permanent: true });
    expect(redirects.find((r) => r.source === "/vision")).toBeUndefined();
  });
});