import fs from "fs";

const path = "components/methodik/MethodikDocs.tsx";
let s = fs.readFileSync(path, "utf8");

s = s.replace(
  `import { MethodikUeberblick, type MethodikFleetStand } from "@/components/methodik/MethodikUeberblick";`,
  `import {
  MethodikAnnahmenSection,
  MethodikGrenzenSection,
  MethodikLizenzenSection,
  type MethodikFleetStand,
} from "@/components/methodik/MethodikUeberblick";
import { MethodikHashScroll } from "@/components/methodik/MethodikHashScroll";
import { MethodikSection } from "@/components/methodik/MethodikSection";`
);

s = s.replace(`import { useEffect, type ReactNode } from "react";`, `import type { ReactNode } from "react";`);

const chapterOverview = `const CHAPTER_OVERVIEW = [
  {
    id: "a-modell",
    de: "A · Modell",
    en: "A · Model",
    deLead:
      "Speicher, Wirkungsgrad, SoC, Flotte ×1–×10 — nur ×1 mit Euro als Modellschätzung.",
    enLead: "Storage, efficiency, state of charge, fleet ×1–×10 — euro only at ×1 as a model estimate.",
  },
  {
    id: "b-daten",
    de: "B · Daten",
    en: "B · Data",
    deLead: "Energy-Charts, SMARD, EPEX, battery-charts, Abregelung, Aktualität und Lizenzen.",
    enLead: "Energy-Charts, SMARD, EPEX, battery-charts, curtailment, freshness and licences.",
  },
  {
    id: "c-netz",
    de: "C · Netz und Beispiele",
    en: "C · Grid and examples",
    deLead: "Badge netzdienlich v1, Standort, Szenarien und Testnetz (n-1).",
    enLead: "Grid-support badge v1, site, scenarios and test grid (n-1).",
  },
  {
    id: "d-recht",
    de: "D · Recht und Glossar",
    en: "D · Law and glossary",
    deLead: "§ 17, § 14a EnWG, VDE-AR-N, BKZ und Begriffe.",
    enLead: "§ 17, § 14a EnWG, VDE-AR-N, BKZ and terms.",
  },
] as const;

const SECTION_NAV = [`;

s = s.replace("const CHAPTERS = [", chapterOverview);

s = s.replace(
  /  useEffect\(\(\) => \{[\s\S]*?  \}, \[\]\);\n  return \(\n    <div className="methodik">/,
  `  return (
    <div className="methodik">
      <MethodikHashScroll />`
);

const navOld =
  /          <nav aria-label=\{tx\("Inhalt", "Contents"\)\}>[\s\S]*?            <MethodikUeberblick language=\{language\} fleet=\{fleet\} \/>\n/;

const navNew = `          <nav className="methodik-toc" aria-label={tx("Kapitel", "Chapters")}>
            <ol className="methodik-chapter-nav">
              {CHAPTER_OVERVIEW.map((chapter) => (
                <li key={chapter.id}>
                  <a href={\`#\${chapter.id}\`}>{language === "de" ? chapter.de : chapter.en}</a>
                  <p>{language === "de" ? chapter.deLead : chapter.enLead}</p>
                </li>
              ))}
            </ol>
            <ol className="methodik-section-nav">
              {SECTION_NAV.map((section, index) => (
                <li key={section.id}>
                  <a href={\`#\${section.id}\`}>
                    {tx(\`\${String(index + 1).padStart(2, "0")} \${section.de}\`, \`\${String(index + 1).padStart(2, "0")} \${section.en}\`)}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <article>
            <section id="a-modell" className="methodik-chapter">
              <h2 className="methodik-chapter-title">{tx("A · Modell", "A · Model")}</h2>
              <p className="methodik-chapter-lead">{language === "de" ? CHAPTER_OVERVIEW[0].deLead : CHAPTER_OVERVIEW[0].enLead}</p>
              <MethodikSection id="annahmen" defaultOpen title={tx("01 Annahmen auf einen Blick", "01 Assumptions at a glance")}>
                <MethodikAnnahmenSection language={language} fleet={fleet} bodyOnly />
              </MethodikSection>
`;

if (!navOld.test(s)) {
  console.error("nav block not found");
  process.exit(1);
}
s = s.replace(navOld, navNew);

const sections = [
  ["was", "04 Was gerechnet wird", "04 What is calculated", false],
  ["grossspeicher", "06 Großspeicher-Modell", "06 Large-storage model", false],
  ["live", "06b Überschuss, Export, Abregelung", "06b Surplus, export, curtailment", false],
  ["uebersicht", "06c Zeitraum-Übersicht auf der Startseite", "06c Period overview on the homepage", false],
  ["groesse", "07 Speichergröße", "07 Storage size", false],
  ["einheiten", "05 Daten und Einheiten", "05 Data and units", false],
  ["ampel", "08 Anschluss-Ampel", "08 Connection light", true],
  ["netzdienlichkeit", "09 Einschätzung netzdienlich", "09 Grid-support estimate", false],
  ["peak-erklaert", "10 Peak Shaving, Schritt für Schritt", "10 Peak shaving, step by step", false],
  ["modelltag", "11 Modelltag Bollingstedt", "11 Bollingstedt model day", false],
  ["beispieltage", "12 Beispieltage", "12 Example days", false],
];

for (const [id, de, en, open] of sections) {
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const openAttr = open ? " defaultOpen" : "";
  const re = new RegExp(
    `(\\s*)<section id="${id}">\\s*\\n\\s*<h2>\\{tx\\("${esc(de)}", "${esc(en)}"\\)\\}</h2>\\s*\\n`,
    "m"
  );
  if (!re.test(s)) {
    console.error("section open not found", id);
    process.exit(1);
  }
  s = s.replace(re, `$1<MethodikSection id="${id}"${openAttr} title={tx("${de}", "${en}")}>\n`);
}

// Close sections before next major block
const closeBefore = [
  "grossspeicher",
  "live",
  "uebersicht",
  "groesse",
  "einheiten",
  "ampel",
  "netzdienlichkeit",
  "peak-erklaert",
  "modelltag",
  "beispieltage",
  "SzenarienMethodik",
];

for (const marker of closeBefore) {
  const re = new RegExp(`(\\s*)</section>(\\s*\\n\\s*<(?:MethodikSection|section|SzenarienMethodik))`);
  s = s.replace(re, `$1</MethodikSection>$2`);
}

// Chapter breaks
s = s.replace(
  /(<MethodikSection id="groesse"[\s\S]*?<\/MethodikSection>)/,
  `$1
            </section>
            <section id="b-daten" className="methodik-chapter">
              <h2 className="methodik-chapter-title">{tx("B · Daten", "B · Data")}</h2>
              <p className="methodik-chapter-lead">{language === "de" ? CHAPTER_OVERVIEW[1].deLead : CHAPTER_OVERVIEW[1].enLead}</p>
              <MethodikSection id="lizenzen" defaultOpen title={tx("02 Quellen und Lizenzen", "02 Sources and licences")}>
                <MethodikLizenzenSection language={language} fleet={fleet} bodyOnly />
              </MethodikSection>
              <MethodikSection id="grenzen" title={tx("03 Grenzen des Modells", "03 Limits of the model")}>
                <MethodikGrenzenSection language={language} fleet={fleet} bodyOnly />
              </MethodikSection>`
);

// einheiten was before grossspeicher - need to move einheiten after grenzen in chapter B
// After script, einheiten is still after was - reorder manually in second pass

s = s.replace(
  /(<MethodikSection id="beispieltage"[\s\S]*?<\/MethodikSection>)/,
  `$1
              <span id="beispiele" className="sr-only" aria-hidden="true" />
              <span id="quartier" className="sr-only" aria-hidden="true" />`
);

s = s.replace(
  /(<MethodikSection id="beispieltage"[\s\S]*?<span id="quartier"[\s\S]*?\/>)/,
  `$1
            </section>
            <section id="c-netz" className="methodik-chapter">
              <h2 className="methodik-chapter-title">{tx("C · Netz und Beispiele", "C · Grid and examples")}</h2>
              <p className="methodik-chapter-lead">{language === "de" ? CHAPTER_OVERVIEW[2].deLead : CHAPTER_OVERVIEW[2].enLead}</p>`
);

// Move einheiten block - remove from chapter A and insert after grenzen (complex) - do after write

// quellen section
s = s.replace(
  `<section id="quellen">
              <details className="site-fold">
              <summary><h2>{tx("15 Quellen", "15 Sources")}</h2></summary>`,
  `</section>
            <section id="d-recht" className="methodik-chapter">
              <h2 className="methodik-chapter-title">{tx("D · Recht und Glossar", "D · Law and glossary")}</h2>
              <p className="methodik-chapter-lead">{language === "de" ? CHAPTER_OVERVIEW[3].deLead : CHAPTER_OVERVIEW[3].enLead}</p>
              <MethodikSection id="quellen" defaultOpen title={tx("15 Quellen", "15 Sources")}>`
);

s = s.replace(
  `              </details>
              <details className="site-fold" id="glossar">
              <summary><h3>{tx("Glossar", "Glossary")}</h3></summary>`,
  `              </MethodikSection>
              <MethodikSection id="glossar" title={tx("Glossar", "Glossary")} level={3}>`
);

s = s.replace(`              </details>
              <p><Link href="/site?view=netz">{tx("Zum Standort", "To the site")}</Link></p>
            </section>`, `              </MethodikSection>
              <p><Link href="/site?view=netz">{tx("Zum Standort", "To the site")}</Link></p>
            </section>`);

fs.writeFileSync(path, s);
console.log("wrote", path);
