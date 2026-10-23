import { render, screen } from "@testing-library/react";

import { LanguageContext } from "@/components/language-context";
import { MethodikDocs } from "@/components/methodik/MethodikDocs";

class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  global.ResizeObserver = ObserverStub as unknown as typeof ResizeObserver;
});

describe("methodik v2", () => {
  it("quotes the BGH press release and keeps the forbidden word out", () => {
    render(
      <LanguageContext.Provider value={{ language: "de", setLanguage: () => {} }}>
        <MethodikDocs />
      </LanguageContext.Provider>
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Jede Zahl auf SpeicherPilot lässt sich hier nachrechnen.");
    expect(document.body.textContent).toContain("Entscheidungsspielraum");
    expect(document.body.textContent).toContain("als angemessen ansehen");
    expect(document.body.textContent).not.toMatch(/Beurteilungsspielraum/);
    expect(document.body.textContent).not.toMatch(/EnWG/);
    expect(document.body.textContent).toContain("η");
    expect(document.getElementById("peak-erklaert")).not.toBeNull();
    expect(document.getElementById("wirkungsgrad")?.tagName).toBe("H3");
    expect(document.body.textContent).not.toMatch(/P_Tag|E_Überschuss/);
    expect(document.querySelector("#groesse var")?.textContent).toBe("PTag");
    expect(document.getElementById("begriff-modellschaetzung")?.tagName).toBe("DT");
    expect(document.body.textContent).toContain("26,6 kWh");
    expect(document.body.textContent).toContain("0,922");
    expect(document.body.textContent).toContain("27,9 %");
    expect(document.body.textContent).not.toMatch(/0,9487|√0,9/);
    expect(document.body.textContent).toContain("Modellschätzung");
    expect(document.body.textContent).toContain("85 %");
    expect(document.body.textContent).toContain("80–90 %");
    expect(document.body.textContent).toContain("PNNL");
    expect(document.body.textContent).toContain("AC zu AC");
    expect(document.body.textContent).not.toMatch(/MORE_STORAGE_ROUND_TRIP|dispatchPeakFleet|GRID_SUPPORT_CONFIG|sizeStorage|SOC_MAX|planSite|autoSize/);
    const phases = document.querySelectorAll(".methodik-phases .day-ring-svg");
    expect(phases).toHaveLength(3);
    for (const ring of phases) {
      const band = ring.querySelector("path[fill]");
      expect(band?.getAttribute("d") ?? "").toMatch(/^M /);
    }
    expect(document.body.textContent).not.toMatch(/1,5 MVA|1\.5 MVA|Fair Grid/);
  });
});
