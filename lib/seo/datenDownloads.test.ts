/**
 * @jest-environment node
 */
import {
  DATEN_DATEIEN,
  buildJahrJson,
  buildOktoberFahrweisenCsv,
  buildStufenCsv,
  buildTagesspitzenCsv,
  findDatenDatei,
  segmentLabels,
  zitiervorschlag,
} from "@/lib/seo/datenDownloads";
import { datasetJsonLd, parseJsonLd } from "@/lib/seo/jsonLd";
import { collectIndexableRoutes } from "@/lib/seo/indexableRoutes";
import { llmsFullTxtBody, llmsTxtBody } from "@/lib/seo/llmsContent";

const ORIGIN = "https://www.speicherpilot.app";

function dataLines(csv: string): string[] {
  return csv.split("\n").filter((line) => line && !line.startsWith("#"));
}

describe("/daten Downloads", () => {
  it("liefert vier Dateien mit eindeutigen Slugs", () => {
    expect(DATEN_DATEIEN).toHaveLength(4);
    expect(new Set(DATEN_DATEIEN.map((d) => d.slug)).size).toBe(4);
    for (const datei of DATEN_DATEIEN) {
      expect(findDatenDatei(datei.slug)).toBe(datei);
      expect(datei.build(ORIGIN).length).toBeGreaterThan(100);
    }
  });

  it("Stufen-CSV hat Kopf mit Lizenz und eine Zeile je Stufe", () => {
    const csv = buildStufenCsv(ORIGIN);
    expect(csv).toContain("CC BY 4.0");
    const [header, ...rows] = dataLines(csv);
    expect(header!.split(",")).toHaveLength(8 + segmentLabels().length);
    expect(rows).toHaveLength(12);
    const nepA = rows.find((row) => row.startsWith("NEP A,2,"));
    expect(nepA).toBeDefined();
    for (const row of rows) {
      expect(row.split(",")).toHaveLength(header!.split(",").length);
    }
  });

  it("Tagesspitzen-CSV hat 365 Tage", () => {
    const [header, ...rows] = dataLines(buildTagesspitzenCsv(ORIGIN));
    expect(header).toBe("tag,restlast_spitze_gw");
    expect(rows).toHaveLength(365);
    expect(rows[0]).toMatch(/^2025-11-16,\d+(\.\d+)?$/);
  });

  it("Oktober-CSV enthält alle drei Fahrweisen", () => {
    const csv = buildOktoberFahrweisenCsv(ORIGIN);
    for (const strategy of [
      "min_peak_perfect_foresight",
      "price_oriented_da_arbitrage",
      "surplus_wind_solar_over_load",
    ]) {
      expect(csv).toContain(strategy);
    }
  });

  it("JSON ist gültig und trägt Lizenz + Zitiervorschlag", () => {
    const parsed = JSON.parse(buildJahrJson(ORIGIN)) as Record<string, unknown>;
    expect(parsed.lizenz).toBe("CC BY 4.0");
    expect(parsed.zitiervorschlag).toBe(zitiervorschlag(ORIGIN));
    expect(parsed.daten).toMatchObject({ stand: expect.any(String) });
  });

  it("enthält keine Euro-Angaben und kein verbotenes Wort", () => {
    for (const datei of DATEN_DATEIEN) {
      const body = datei.build(ORIGIN);
      expect(body).not.toMatch(/€|EUR\b/);
      expect(body.toLowerCase()).not.toContain("netzdienlich");
    }
  });

  it("Dataset-JSON-LD mit Lizenz und DataDownload", () => {
    const ds = parseJsonLd(
      datasetJsonLd({
        path: "/daten",
        name: "Test",
        description: "Beschreibung",
        temporalCoverage: "2025-11-16/2026-11-15",
        license: "https://creativecommons.org/licenses/by/4.0/",
        distribution: [{ name: "a", contentUrl: "/daten/a.csv", encodingFormat: "text/csv" }],
      }),
    ) as Record<string, unknown>;
    expect(ds.license).toBe("https://creativecommons.org/licenses/by/4.0/");
    expect(ds.isAccessibleForFree).toBe(true);
    expect(ds.distribution).toEqual([
      expect.objectContaining({ "@type": "DataDownload", encodingFormat: "text/csv" }),
    ]);
  });

  it("/daten steht in Sitemap-Routen und llms.txt", () => {
    expect(collectIndexableRoutes().map((r) => r.path)).toContain("/daten");
    expect(llmsTxtBody()).toContain("/daten");
    expect(llmsFullTxtBody()).toContain("speicherpilot-jahr-stufen.csv");
  });
});
