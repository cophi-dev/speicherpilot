"use client";

import { useEffect, useState } from "react";

import { useLanguage } from "@/components/language-context";

const SECTIONS = [
  { id: "ueberblick", de: "Überblick", en: "Overview" },
  { id: "daten", de: "Daten", en: "Data" },
  { id: "dimensionierung", de: "Dimensionierung", en: "Sizing" },
  { id: "dispatch", de: "Dispatch", en: "Dispatch" },
  { id: "wirtschaft", de: "Wirtschaftlichkeit", en: "Economics" },
  { id: "anschluss", de: "Netzanschluss", en: "Connection" },
  { id: "live", de: "Live Deutschland", en: "Live Germany" },
  { id: "quellen", de: "Quellen", en: "Sources" },
  { id: "grenzen", de: "Grenzen", en: "Limits" },
  { id: "changelog", de: "Changelog", en: "Changelog" },
] as const;

export function MethodikDocs() {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const nodes = SECTIONS.map((section) => document.getElementById(section.id)).filter((node): node is HTMLElement => node !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) {
          setActive(visible.target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.1, 0.4] }
    );
    for (const node of nodes) {
      observer.observe(node);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-5 py-10 md:px-8 lg:grid-cols-[240px_minmax(0,68ch)] lg:gap-16">
      <div className="min-w-0 lg:sticky lg:top-20 lg:self-start">
        <label className="block lg:hidden">
          <span className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Inhalt", "Contents")}</span>
          <select className="mt-2 h-10 w-full rounded-md border border-input bg-card px-2" value={active} onChange={(event) => document.getElementById(event.target.value)?.scrollIntoView()}>
            {SECTIONS.map((section, index) => (
              <option key={section.id} value={section.id}>
                §{index + 1} {language === "de" ? section.de : section.en}
              </option>
            ))}
          </select>
        </label>
        <nav className="hidden lg:block" aria-label={tx("Inhalt", "Contents")}>
          <ol className="space-y-1 text-[13px]">
            {SECTIONS.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={`num block border-l-2 py-1 pl-3 ${active === section.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"}`}
                >
                  §{index + 1} {language === "de" ? section.de : section.en}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>
      <article className="min-w-0 max-w-full space-y-12 lg:max-w-[68ch]">
        <header>
          <h1 className="text-[28px] font-medium md:text-[36px]">{tx("Methodik", "Method")}</h1>
          <p className="mt-3 text-muted-foreground">
            {tx(
              "Was der Standort-Rechner rechnet, welche Zahlen beobachtet sind und welche nur ein Modell.",
              "What the site calculator computes, which figures are observed, and which are only a model."
            )}
          </p>
        </header>
        <Section id="ueberblick" n="§1" title={tx("Überblick", "Overview")}>
          <p>{tx("Der Rechner legt einen Batteriespeicher auf ein Lastprofil, eine PV-Anlage und eine Anschlussleistung aus. Er schätzt Peak-Shaving, eine einfache Arbitrage und eine undiskontierte Amortisation.", "The calculator sizes a battery against a load profile, a PV array, and a connection capacity. It estimates peak shaving, a simple arbitrage, and an undiscounted payback.")}</p>
          <p className="mt-3">{tx("Er ist kein Gutachten und keine Handelsempfehlung.", "It is not an engineering opinion and not trading advice.")}</p>
          <Callout title={tx("Nicht enthalten", "Not included")}>{tx("SCADA, Handelsempfehlung, Netzbetreiber-Interna, Regelenergie, Netzentgelt §19 StromNEV.", "SCADA, a trading recommendation, DSO internals, balancing energy, §19 StromNEV grid charges.")}</Callout>
        </Section>
        <Section id="daten" n="§2" title={tx("Daten und Auflösung", "Data and resolution")}>
          <p>{tx("Beispielprofile haben 15 Minuten und ein illustratives Jahr mit 365 Tagen, Zeitzone Europe/Berlin, ohne gemessene Wetterdaten. Lücken bis 8 Intervalle werden linear interpoliert.", "Example profiles are 15 minutes over an illustrative 365-day year, Europe/Berlin, with no measured weather. Gaps of up to 8 intervals are interpolated in a straight line.")}</p>
          <div className="num mt-4 overflow-x-auto border border-border bg-secondary p-4 text-[13px]">
            <p>timestamp,kW</p>
            <p>2025-01-01T00:00:00+01:00,420</p>
            <p>2025-01-01T00:15:00+01:00,418</p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{tx("Spalte kWh wird mit 60/Intervall in kW umgerechnet. 15 oder 60 Minuten.", "A kWh column is converted to kW by 60/interval. 15 or 60 minutes.")}</p>
        </Section>
        <Section id="dimensionierung" n="§3" title={tx("Dimensionierung", "Sizing")}>
          <Formula>P_BESS = max(0, P95(P_import,Tag − P_limit))</Formula>
          <Formula>E_BESS = P95(E_Ueberschuss,Tag) / (η_dis · 0,85)</Formula>
          <p className="text-sm text-muted-foreground">{tx("η_dis = √RTE. Das SoC-Fenster ist 10–95 %. P95 lässt die härtesten Tage über dem Limit. Das ist Absicht und steht im Anschluss-Check.", "η_dis = √round-trip efficiency. The SoC window is 10–95%. P95 leaves the hardest days above the limit. That is intentional and shown in the connection check.")}</p>
          <table className="mt-4 w-full text-sm">
            <thead className="bg-secondary"><tr className="num text-[12px] uppercase"><th className="px-2 py-2 text-left">{tx("Symbol", "Symbol")}</th><th className="px-2 py-2 text-left">{tx("Bedeutung", "Meaning")}</th><th className="px-2 py-2 text-left">{tx("Einheit", "Unit")}</th></tr></thead>
            <tbody className="num">
              <tr className="border-t border-border"><td className="px-2 py-2">P_BESS</td><td>{tx("Leistung", "Power")}</td><td>kW</td></tr>
              <tr className="border-t border-border"><td className="px-2 py-2">E_BESS</td><td>{tx("Energie", "Energy")}</td><td>kWh</td></tr>
              <tr className="border-t border-border"><td className="px-2 py-2">P_limit</td><td>{tx("Anschluss", "Connection")}</td><td>kW</td></tr>
            </tbody>
          </table>
        </Section>
        <Section id="dispatch" n="§4" title="Dispatch">
          <p>{tx("Zuerst Peak Shaving, dann Arbitrage auf dem Rest.", "Peak shaving first, then arbitrage on what is left.")}</p>
          <pre className="num mt-4 overflow-x-auto bg-secondary p-4 text-[13px] text-muted-foreground">{`for each day:
  if import > limit: discharge
  else if later excess > stored energy: charge
  else if dynamic tariff and price in the day's outer quintile:
    charge low / discharge high, inside the limit`}</pre>
        </Section>
        <Section id="wirtschaft" n="§5" title={tx("Wirtschaftlichkeit", "Economics")}>
          <p>{tx("Nutzen = Leistungspreis-Ersparnis + Arbeitspreis auf der Peak-Shaving-Energie + Arbitrage zum synthetischen oder übergebenen Preis + Änderung der Einspeisung − 1,5 % CAPEX als OPEX.", "Benefit = demand-charge saving + retail energy on the peak-shaving throughput + arbitrage at the synthetic or supplied price + the change in export − 1.5% of CAPEX as OPEX.")}</p>
          <p className="mt-3">{tx("Amortisation = CAPEX / Jahresnutzen, ohne Diskontierung und ohne Degradation. Standard-CAPEX 500 €/kWh ist eine Annahme, kein Angebot.", "Payback = CAPEX / annual benefit, with no discounting and no degradation. The default CAPEX of 500 €/kWh is an assumption, not a quote.")}</p>
        </Section>
        <Section id="anschluss" n="§6" title={tx("Netzanschluss-Check", "Connection check")}>
          <p>{tx("OK unter 90 % der Anschlussleistung, nahe am Limit ab 90 %, über dem Limit wenn Bezug oder Rückspeisung die Leistung überschreitet. Die Checkliste verlangt zusätzlich 10 % Reserve und null Überschreitungsstunden.", "OK below 90% of the connection, near the limit from 90%, over the limit when import or export exceeds capacity. The checklist also asks for 10% reserve and zero hours above the limit.")}</p>
        </Section>
        <Section id="live" n="§7" title={tx("Live-Ansicht Deutschland", "Live view, Germany")}>
          <p>{tx("Erzeugung und Last kommen von Energy-Charts. Die Bilanz nutzt nur einen Zeitpunkt, an dem Last und mindestens eine Erzeugungsserie veröffentlicht sind. Fehlt die Erzeugung, steht dort n. v. und kein Defizit aus 0 GW.", "Generation and load come from Energy-Charts. The balance uses only a timestamp where load and at least one generation series are published. If generation is missing, the page shows n/a and does not invent a deficit from 0 GW.")}</p>
          <p className="mt-3">{tx("Der Flotten-SoC ist eine Schätzung, keine Telemetrie. Überschuss, Import und Abregelung können am selben Tag zusammen stehen, ohne gleichzeitig zu sein.", "Fleet state of charge is an estimate, not telemetry. Surplus, imports, and curtailment can appear on the same day without being simultaneous.")}</p>
        </Section>
        <Section id="quellen" n="§8" title={tx("Datenquellen", "Sources")}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary"><tr className="num text-[12px] uppercase"><th className="px-2 py-2 text-left">{tx("Quelle", "Source")}</th><th className="px-2 py-2 text-left">{tx("Inhalt", "Content")}</th></tr></thead>
              <tbody>
                <tr className="border-t border-border"><td className="px-2 py-2">Energy-Charts / Fraunhofer ISE</td><td>{tx("Leistung Deutschland, 15 min", "Germany power, 15 min")}</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2">Netztransparenz</td><td>{tx("Abregelung / Redispatch", "Curtailment / redispatch")}</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2">MaStR</td><td>{tx("Speicherkarte", "Storage map")}</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2">OSM / CARTO</td><td>{tx("Kartenkacheln", "Map tiles")}</td></tr>
              </tbody>
            </table>
          </div>
        </Section>
        <Section id="grenzen" n="§9" title={tx("Grenzen und Haftung", "Limits and liability")}>
          <ul className="list-disc pl-5">
            <li>{tx("Beispielprofile und das Day-Ahead-Band sind synthetisch und als BEISPIELDATEN markiert.", "Example profiles and the day-ahead band are synthetic and marked as example data.")}</li>
            <li>{tx("Keine Netzentgelte, keine Steuern, keine Finanzierung, keine Degradation.", "No grid tariffs beyond the inputs, no tax, no financing, no degradation.")}</li>
            <li>{tx("Keine Beschaffungs- oder Anlagenberatung.", "Not procurement or plant advice.")}</li>
          </ul>
        </Section>
        <Section id="changelog" n="§10" title={tx("Changelog", "Changelog")}>
          <p className="num">2026-10-20 — {tx("Control-Room-Oberfläche, Standort-Rechner, Live unter /live.", "Control-room interface, site calculator, live view at /live.")}</p>
        </Section>
      </article>
    </div>
  );
}

function Section({ id, n, title, children }: { id: string; n: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{n}</p>
      <h2 className="mt-2 text-2xl font-medium">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed">{children}</div>
      <p className="num mt-4 text-[12px] text-muted-foreground">2026-10-20</p>
    </section>
  );
}

function Formula({ children }: { children: string }) {
  return <p className="num border border-border bg-secondary px-4 py-3 text-[15px]">{children}</p>;
}

function Callout({ title, children }: { title: string; children: string }) {
  return (
    <aside className="border-l-[3px] border-warning pl-4">
      <p className="num text-[12px] tracking-[0.08em] uppercase">{title}</p>
      <p className="mt-1">{children}</p>
    </aside>
  );
}
