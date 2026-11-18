import { render, screen, waitFor } from "@testing-library/react";

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

const NETZ_ANSCHLUSS_PRUEFUNG = "Netzanschluss" + "prüfung";

function bodyText(): string {
  return document.body.textContent?.replace(/\u00a0/g, " ") ?? "";
}

describe("methodik v2", () => {
  it("quotes the BGH press release and keeps the forbidden word out", async () => {
    render(
      <LanguageContext.Provider value={{ language: "de", setLanguage: () => {} }}>
        <MethodikDocs />
      </LanguageContext.Provider>
    );
    for (const id of ["netzdienlichkeit", "netz", "szenarien", "beispieltage", "groesse", "grossspeicher", "peak-erklaert", "glossar", "grenzen", "was"]) {
      const node = document.getElementById(id);
      if (node instanceof HTMLDetailsElement) {
        node.open = true;
        node.dispatchEvent(new Event("toggle"));
      }
    }
    await waitFor(() => {
      expect(bodyText()).toContain("Entscheidungsspielraum");
      expect(document.getElementById("wirkungsgrad")?.tagName).toBe("H3");
      expect(document.getElementById("begriff-modellschaetzung")?.tagName).toBe("DT");
      expect(document.body.textContent).toContain("Szenarien rechnen");
    });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Jede Zahl auf SpeicherPilot lässt sich hier nachrechnen."
    );
    const text = bodyText();
    expect(text).toContain("als angemessen ansehen");
    expect(text).not.toMatch(/Beurteilungsspielraum/);
    expect(text).toContain("§ 17 Abs. 2b EnWG");
    expect(text).toContain("230");
    expect(text).toContain("η");
    expect(document.getElementById("peak-erklaert")).not.toBeNull();
    expect(text).not.toMatch(/P_Tag|E_Überschuss/);
    expect(document.querySelector("#groesse var")?.textContent).toBe("PTag");
    expect(text).toContain("26,6 kWh");
    expect(text).toContain("0,922");
    expect(text).toContain("27,9 %");
    expect(text).not.toMatch(/0,9487|√0,9/);
    expect(text).toContain("Modellschätzung");
    expect(text).toContain("85 %");
    expect(text).toContain("80–90 %");
    expect(text).toContain("PNNL");
    expect(text).toContain("AC zu AC");
    expect(text).not.toMatch(/MORE_STORAGE_ROUND_TRIP|dispatchPeakFleet|GRID_SUPPORT_CONFIG|sizeStorage|SOC_MAX|planSite|autoSize/);
    const phases = document.querySelectorAll(".methodik-phases .day-ring-svg");
    expect(phases).toHaveLength(3);
    for (const ring of phases) {
      const band = ring.querySelector("path[fill]");
      expect(band?.getAttribute("d") ?? "").toMatch(/^M /);
    }
    expect(text).not.toMatch(/1,5 MVA|1\.5 MVA|Fair Grid/);
    expect(text).not.toMatch(new RegExp(NETZ_ANSCHLUSS_PRUEFUNG + "|Tesla"));
    expect(screen.getByRole("heading", { name: "A1 Annahmen auf einen Blick" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "B1 Datenquellen" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "B2 Grenzen des Modells" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Annahme" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Lizenz" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Namensnennung" })).toBeInTheDocument();
    expect(text).toContain("Bundesnetzagentur | SMARD.de");
    expect(text).toContain("Datenlizenz Deutschland – Namensnennung – Version 2.0");
    expect(text).toContain("ODbL 1.0");
    expect(text).toContain("energy-charts.info");
    expect(text).toContain("BSD-3-Clause");
    const annahmen = document.getElementById("annahmen");
    const was = document.getElementById("was");
    expect(annahmen).not.toBeNull();
    expect(was).not.toBeNull();
    expect(annahmen && was && (annahmen.compareDocumentPosition(was) & Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy();
    expect(document.querySelector("#annahmen th[scope='col']")).not.toBeNull();
    expect(document.querySelector("#annahmen th[scope='row']")).not.toBeNull();
  });
});
