import fs from "node:fs";
import path from "node:path";

import raw from "@/data/netz/netz-demo.json";
import { GLOSSARY } from "@/lib/glossary";

const BANNED = /Netzanschluss(prüf|pruef)|Anschlussprüfung|Tesla|#\d{2,}/i;

const FILES = [
  "lib/netzTexte.ts",
  "lib/netzDemo.ts",
  "lib/netzDemoSchema.ts",
  "app/netz/page.tsx",
  "components/methodik/NetzMethodik.tsx",
  "components/netz/NetzDemo.tsx",
  "components/netz/NetzKarte.tsx",
  "components/uebersicht/Uebersicht.tsx",
  "components/sim/SiteConnectionSim.tsx",
];

const GLOSSARY_IDS = [
  "lastfluss",
  "spannung-pu",
  "auslastung",
  "hosting-capacity",
  "testnetz",
  "starklast",
  "schwachlast-pv",
  "trennstelle",
  "stufensteller",
  "n-1",
];

function stringsOf(value: unknown, found: string[]) {
  if (typeof value === "string") {
    found.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) stringsOf(item, found);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) stringsOf(item, found);
  }
}

describe("netz wording", () => {
  it("keeps the banned words out of the new texts", () => {
    const hits: string[] = [];
    for (const file of FILES) {
      const text = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      if (BANNED.test(text)) {
        hits.push(file);
      }
    }
    const glossaryText = GLOSSARY.filter((entry) => GLOSSARY_IDS.includes(entry.id))
      .map((entry) => `${entry.term.de} ${entry.term.en} ${entry.text.de} ${entry.text.en}`)
      .join("\n");
    if (BANNED.test(glossaryText)) {
      hits.push("glossary");
    }
    const jsonStrings: string[] = [];
    stringsOf(raw, jsonStrings);
    if (jsonStrings.some((item) => BANNED.test(item))) {
      hits.push("netz-demo.json");
    }
    expect(hits).toEqual([]);
  });
});
