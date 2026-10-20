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
  { id: "netzdienlichkeit", de: "Netzdienlichkeit", en: "Grid support" },
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
          <p>{tx("Der Rechner legt einen Batteriespeicher auf ein Lastprofil, eine PV-Anlage und eine Anschlussleistung aus. Dieselbe Rechnung speist zwei Sichten: Projektierer (Größe, Peak-Shaving, 15-Minuten-Arbitrage, CAPEX, Amortisation, NPV) und Netzbetreiber (angefragte gegen verfügbare Leistung, Spannungshinweis, netzdienlich gegen marktgetrieben).", "The calculator sizes a battery against a load profile, a PV array, and a connection capacity. The same result feeds two views: a developer view (size, peak shaving, 15-minute arbitrage, CAPEX, payback, NPV) and a grid-operator view (requested versus available capacity, a voltage hint, grid-serving versus market-driven operation).")}</p>
          <p className="mt-3">{tx("Er ist kein Gutachten, keine Handelsempfehlung und keine Anschlusszusage. Verteilnetzbetreiber prüfen und schließen Speicher Dritter an; das Modell unterstellt nicht, dass sie den Speicher besitzen oder betreiben.", "It is not an engineering opinion, not trading advice, and not a connection offer. Distribution operators assess and connect third-party storage; the model does not assume that they own or operate it.")}</p>
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
          <pre className="num mt-4 overflow-x-auto bg-secondary p-4 text-[13px] text-muted-foreground">{`market, for each day:
  if import > limit: discharge
  else if later excess > stored energy: charge
  else if dynamic tariff and price in the day's outer quintile:
    charge low / discharge high, inside the limit

grid-serving, same battery and same limit:
  discharge above the shave target
  charge from on-site surplus only, or precharge up to
  min(limit, that day's uncontrolled import peak)
  no arbitrage`}</pre>
          <p className="text-sm text-muted-foreground">{tx("Die Netzbetreiber-Sicht zeigt, ob die gewählte Betriebsart die Spitze am Netzanschlusspunkt senkt oder hebt. Die rote Linie in der Grafik ist die eingegebene Anschlussleistung.", "The grid-operator view shows whether the selected operation lowers or raises the peak at the connection point. The red line on the chart is the connection capacity you entered.")}</p>
        </Section>
        <Section id="wirtschaft" n="§5" title={tx("Wirtschaftlichkeit", "Economics")}>
          <p>{tx("Nutzen = Leistungspreis-Ersparnis + Arbeitspreis auf der Peak-Shaving-Energie + Arbitrage zum synthetischen oder übergebenen Preis + Änderung der Einspeisung − 1,5 % CAPEX als OPEX.", "Benefit = demand-charge saving + retail energy on the peak-shaving throughput + arbitrage at the synthetic or supplied price + the change in export − 1.5% of CAPEX as OPEX.")}</p>
          <p className="mt-3">{tx("Amortisation = CAPEX / Jahresnutzen, solange der Diskont 0 ist. NPV = −CAPEX + Summe der diskontierten Jahresnutzen über die Lebensdauer. Derselbe Jahresnutzen, kein zweites Preisszenario. Standard-CAPEX 500 €/kWh ist eine Annahme, kein Angebot.", "Payback = CAPEX / annual benefit while the discount rate is 0. NPV = −CAPEX + the sum of discounted annual benefits over the lifetime. The same annual benefit, not a second price scenario. The default CAPEX of 500 €/kWh is an assumption, not a quote.")}</p>
          <p className="mt-3">{tx("Die Arbitrage nutzt 15-Minuten-Preise. Ohne übergebene Reihe ist das ein synthetisches Band in Day-Ahead-Form, kein Intraday-Orderbuch. Erlösstapelung (Regelenergie, Kapazitätsmärkte) wird nicht bepreist und steht als Platzhalter ohne Euro-Betrag.", "Arbitrage uses 15-minute prices. Without a supplied series that band is synthetic and shaped like day-ahead, not an intraday order book. Revenue stacking (balancing, capacity markets) is not priced and is shown as a placeholder with no euro amount.")}</p>
        </Section>
        <Section id="anschluss" n="§6" title={tx("Netzanschluss-Check", "Connection check")}>
          <p>{tx("OK unter 90 % der Anschlussleistung, nahe am Limit ab 90 %, über dem Limit wenn Bezug oder Rückspeisung die Leistung überschreitet. Die Checkliste verlangt zusätzlich 10 % Reserve und null Überschreitungsstunden. Angefragt ist die höhere der beiden Spitzen ohne Speicher, verfügbar ist die eingegebene Anschlussleistung.", "OK below 90% of the connection, near the limit from 90%, over the limit when import or export exceeds capacity. The checklist also asks for 10% reserve and zero hours above the limit. Requested power is the higher of the two peaks without storage. Available power is the connection capacity you entered.")}</p>
          <p className="mt-3">{tx("Spannungshinweis aus der angefragten Leistung: bis 135 kW NS und VDE-AR-N 4105, darüber bis 20 MW MS und VDE-AR-N 4110, darüber HS und VDE-AR-N 4120. Das sind Planungshinweise mit Verweis auf die FNN-Seiten, nicht der Anwendungsbereich im Rechtssinn und keine Netzanschlusszusage.", "Voltage hint from requested power: up to 135 kW LV and VDE-AR-N 4105, above that up to 20 MW MV and VDE-AR-N 4110, above that HV and VDE-AR-N 4120. These are planning hints that point at the FNN pages, not the legal scope of the rules and not a connection offer.")}</p>
          <p className="mt-3">{tx("Die Trafolast ist die Spitze am Netzanschlusspunkt geteilt durch einen Planungswert. Ohne eigenen Wert ist das die Anschlussleistung. Es ist kein gemessener Transformator.", "Transformer loading is the peak at the connection point divided by a planning rating. Without a separate value that rating is the connection capacity. It is not a measured transformer.")}</p>
          <p className="mt-3">{tx("Das flexible Anschlussverhältnis ist ein zweites Szenario desselben Kerns: Bezug und Einspeisung werden auf einen Anteil der festen Leistung gekappt. Was der Speicher nicht aufnimmt, gilt im Szenario als abgeregelt. Das ist kein SCADA-Messwert.", "The flexible connection agreement is a second scenario of the same core: import and export are capped at a share of firm capacity. What the battery does not absorb is treated as curtailed in the scenario. That is not a SCADA measurement.")}</p>
        </Section>
        <Section id="netzdienlichkeit" n="§7" title={tx("Netzdienlichkeit", "Grid support")}>
          <p>{tx("Die Marke vergleicht die Entladeenergie mit der Auslastung des Anschlusses. Ein Intervall zählt als Spitzenfenster, wenn die Standortlast mindestens 90 % der Anschlussleistung erreicht. Der Anteil ist die Entladeenergie in diesen Fenstern geteilt durch die gesamte Entladeenergie.", "The badge compares discharge energy with connection utilisation. An interval counts as a peak window when site load is at least 90% of the connection capacity. The share is discharge energy in those windows divided by all discharge energy.")}</p>
          <p className="mt-3">{tx("NETZDIENLICH ab 60 % und ohne neue Bezugsspitze. GEMISCHT von 30 % bis unter 60 %. MARKTGETRIEBEN unter 30 %. ERZEUGT NEUE SPITZE, sobald ein Ladeintervall die Bezugsspitze über die Spitze ohne Speicher hebt.", "GRID-SUPPORTIVE from 60% and only if charging creates no new import peak. MIXED from 30% up to 60%. MARKET-DRIVEN below 30%. CREATES A NEW PEAK as soon as a charging interval lifts the import above the peak without storage.")}</p>
          <p className="mt-3">{tx("Die Schwellen 90 %, 60 % und 30 % stehen an einer Stelle im Rechenkern (GRID_SUPPORT_CONFIG). Sie sind vorläufig und noch nicht fachlich bestätigt.", "The 90%, 60% and 30% thresholds live in one place in the calculation core (GRID_SUPPORT_CONFIG). They are provisional and not yet confirmed.")}</p>
        </Section>
        <Section id="live" n="§8" title={tx("Live-Ansicht Deutschland", "Live view, Germany")}>
          <p>{tx("Erzeugung und Last kommen von Energy-Charts. Die Bilanz nutzt nur einen Zeitpunkt, an dem Last und mindestens eine Erzeugungsserie veröffentlicht sind. Fehlt die Erzeugung, steht dort n. v. und kein Defizit aus 0 GW.", "Generation and load come from Energy-Charts. The balance uses only a timestamp where load and at least one generation series are published. If generation is missing, the page shows n/a and does not invent a deficit from 0 GW.")}</p>
          <p className="mt-3">{tx("Der Flotten-SoC ist eine Schätzung, keine Telemetrie. Überschuss, Import und Abregelung können am selben Tag zusammen stehen, ohne gleichzeitig zu sein.", "Fleet state of charge is an estimate, not telemetry. Surplus, imports, and curtailment can appear on the same day without being simultaneous.")}</p>
        </Section>
        <Section id="quellen" n="§9" title={tx("Datenquellen", "Sources")}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary"><tr className="num text-[12px] uppercase"><th className="px-2 py-2 text-left">{tx("Quelle", "Source")}</th><th className="px-2 py-2 text-left">{tx("Inhalt", "Content")}</th></tr></thead>
              <tbody>
                <tr className="border-t border-border"><td className="px-2 py-2">Energy-Charts / Fraunhofer ISE</td><td>{tx("Leistung Deutschland, 15 min", "Germany power, 15 min")}</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2">Netztransparenz</td><td>{tx("Abregelung / Redispatch", "Curtailment / redispatch")}</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2">MaStR</td><td>{tx("Speicherkarte", "Storage map")}</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2">OSM / CARTO</td><td>{tx("Kartenkacheln", "Map tiles")}</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2"><a className="underline underline-offset-[3px]" href="https://www.vde.com/de/fnn/themen/tar/tar-niederspannung">VDE FNN · TAR Niederspannung</a></td><td>VDE-AR-N 4105</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2"><a className="underline underline-offset-[3px]" href="https://www.vde.com/de/fnn/arbeitsgebiete/tar/tar-mittelspannung-vde-ar-n-4110">VDE FNN · VDE-AR-N 4110</a></td><td>{tx("Mittelspannung, Verweis", "Medium voltage, reference")}</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2"><a className="underline underline-offset-[3px]" href="https://www.vde.com/de/fnn/arbeitsgebiete/tar/tar-hochspannung-vde-ar-n-4120">VDE FNN · VDE-AR-N 4120</a></td><td>{tx("Hochspannung, Verweis", "High voltage, reference")}</td></tr>
              </tbody>
            </table>
          </div>
        </Section>
        <Section id="grenzen" n="§10" title={tx("Grenzen und Haftung", "Limits and liability")}>
          <ul className="list-disc pl-5">
            <li>{tx("Beispielprofile und das Day-Ahead-Band sind synthetisch und als BEISPIELDATEN markiert.", "Example profiles and the day-ahead band are synthetic and marked as example data.")}</li>
            <li>{tx("Keine Netzentgelte, keine Steuern, keine Finanzierung, keine Degradation.", "No grid tariffs beyond the inputs, no tax, no financing, no degradation.")}</li>
            <li>{tx("Keine Beschaffungs- oder Anlagenberatung.", "Not procurement or plant advice.")}</li>
            <li>{tx("VDE-AR-N 4105, 4110 und 4120 sind Quellenverweise. Die Spannungsschwellen 135 kW und 20 MW sind Planungshinweise in diesem Rechner, keine Rechtsauskunft.", "VDE-AR-N 4105, 4110 and 4120 are source references. The 135 kW and 20 MW voltage thresholds are planning hints in this calculator, not legal advice.")}</li>
          </ul>
        </Section>
        <Section id="changelog" n="§11" title={tx("Changelog", "Changelog")}>
          <p className="num">2026-10-20 — {tx("Control-Room-Oberfläche, Standort-Rechner, Live unter /live.", "Control-room interface, site calculator, live view at /live.")}</p>
          <p className="num mt-2">2026-10-20 — {tx("Zwei Sichten auf /site: Projektierer und Netzbetreiber, ein Rechenkern. NPV, Spannungshinweis, netzdienlicher Betrieb, flexibles Anschluss-Szenario.", "Two views on /site: developer and grid operator, one calculation core. NPV, voltage hint, grid-serving operation, flexible-connection scenario.")}</p>
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
