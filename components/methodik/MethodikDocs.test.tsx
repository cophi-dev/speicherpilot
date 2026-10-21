import { render, screen } from "@testing-library/react";

import { LanguageContext } from "@/components/language-context";
import { MethodikDocs } from "@/components/methodik/MethodikDocs";

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
  });
});
