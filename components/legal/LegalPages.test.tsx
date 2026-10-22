import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";

import { LanguageContext } from "@/components/language-context";
import { LegalNotice } from "@/components/legal/LegalNotice";
import { PrivacyNotice } from "@/components/legal/PrivacyNotice";

function renderDe(node: ReactNode) {
  return render(
    <LanguageContext.Provider value={{ language: "de", setLanguage: () => {} }}>
      {node}
    </LanguageContext.Provider>
  );
}

describe("legal pages", () => {
  it("prints the imprint without a phone number or stock disclaimer", () => {
    renderDe(<LegalNotice />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Impressum");
    expect(document.body.textContent).toContain("Angaben gemäß § 5 DDG und § 18 Abs. 1 MStV");
    expect(document.body.textContent).toContain("Phillipp Zarindast");
    expect(document.body.textContent).toContain("Brödermannsweg 77a");
    expect(document.body.textContent).toContain("22453 Hamburg");
    expect(screen.getByRole("link", { name: "pzarindast@gmail.com" })).toHaveAttribute("href", "mailto:pzarindast@gmail.com");
    expect(document.body.textContent).toContain("Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV: Phillipp Zarindast, Anschrift wie oben.");
    expect(document.body.textContent).toContain("privates, nicht kommerzielles Projekt");
    expect(document.body.textContent).toContain("Modellschätzungen, keine Beratung");
    expect(document.body.textContent).not.toMatch(/Telefon|Tel\.|\+49|Haftung|Disclaimer/i);
  });

  it("keeps the privacy notice short and marks the two unchecked hosting facts", () => {
    renderDe(<PrivacyNotice />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Datenschutz");
    expect(document.body.textContent).toContain("Vercel Inc. (USA)");
    expect(document.body.textContent).toContain("Art. 6 Abs. 1 lit. f DSGVO");
    expect(document.body.textContent).toContain("Auftragsverarbeiter");
    expect(document.body.textContent).toContain("{{PRÜFEN: DPF/SCC}}");
    expect(document.body.textContent).toContain("{{PRÜFEN: Speicherdauer}}");
    expect(document.body.textContent).toContain("keine Cookies, kein Tracking, keine Kontaktformulare und keine Konten");
    expect(screen.getByRole("link", { name: "datenschutz-hamburg.de" })).toHaveAttribute("href", "https://datenschutz-hamburg.de");
    expect(document.body.textContent).toContain("Oktober 2026");
    expect(document.body.textContent).not.toMatch(/Telefon|\+49|Cookie-Banner|Google Analytics/i);
  });

  it("points the English view at the German text", () => {
    render(
      <LanguageContext.Provider value={{ language: "en", setLanguage: () => {} }}>
        <LegalNotice />
      </LanguageContext.Provider>
    );
    expect(document.body.textContent).toContain("The binding text of this page is the German legal notice below.");
    expect(document.body.textContent).toContain("Phillipp Zarindast");
  });
});
