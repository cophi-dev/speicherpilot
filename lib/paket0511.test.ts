/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { startPointe } from "@/lib/startPointe";
import { auffaelligkeitForDay } from "@/lib/auffaelligkeit";
import fixture from "@/lib/__fixtures__/auffaelligkeit-records.json";

describe("startPointe", () => {
  const records = fixture as import("@/lib/auffaelligkeit").TagesKennzahlRecord[];

  it("differs from tag H1 for dry-streak yesterday", () => {
    const dayKey = "2026-11-02";
    const start = startPointe(records, dayKey);
    const tagSerieH1 = `${records.find((r) => r.dateKey === dayKey)!.dryStreak}. Tag in Folge ohne Überschuss`;
    expect(start.h1).toContain("30 Tage");
    expect(start.h1).not.toBe(tagSerieH1);
    expect(start.tagH1ForCompare).toBe(tagSerieH1);
  });

  it("differs from metric tag kopfH1", () => {
    const dayKey = "2026-10-29";
    const start = startPointe(records, dayKey);
    const tag = auffaelligkeitForDay(records, dayKey);
    expect(start.h1).not.toBe(tag.kopfH1);
    expect(start.h1).toMatch(/30 Tage/);
  });
});

describe("site shell footer (Paket 05.11)", () => {
  it("does not expose Quellen/Glossar accordion columns", () => {
    const src = readFileSync(join(process.cwd(), "components/site-shell.tsx"), "utf8");
    expect(src).toMatch(/label: "Monat"/);
    expect(src).not.toMatch(/site-footer-cols/);
    expect(src).not.toMatch(/uppercase">Quellen/);
    expect(src).not.toMatch(/uppercase">Glossar/);
  });
});

describe("Ort netz chart axes (Paket 05.11)", () => {
  it("names axis titles in OrtArchetypen SVG", () => {
    const src = readFileSync(join(process.cwd(), "components/site/OrtArchetypen.tsx"), "utf8");
    expect(src).toMatch(/ort-netz-nutzen/);
    expect(src).toMatch(/Uhrzeit \(Mustertag\)/);
    expect(src).toMatch(/Auslastung der Leitung in %/);
  });
});
