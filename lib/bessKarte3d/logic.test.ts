import karteRaw from "@/data/bess-karte-3d/karte3d.json";

import {
  blNetto,
  computeKumulierteKurve,
  deriveMwhReferenzWerte,
  epStunden,
  filterEinheiten,
  isEpPlausibel,
  punktRadius2d,
  saeulenHoehe,
  sitesAtCut,
} from "@/lib/bessKarte3d/logic";
import {
  clampCamera3d,
  createProjectionParams3d,
  DEFAULT_CAMERA_3D,
  geoToPlane,
  projectCuboid,
} from "@/lib/bessKarte3d/projection3d";
import type { Karte3dData } from "@/lib/bessKarte3d/types";

const data = karteRaw as unknown as Karte3dData;

describe("bessKarte3d Kontrollwerte und Logik", () => {
  it("prüft Gesamtbestand (575 Einheiten, 4.620,459 MW netto, 550 Lokationen, 545 kartiert)", () => {
    expect(data.einheiten).toHaveLength(575);
    const cut = sitesAtCut(data.einheiten, "2026-11");
    expect(cut.totalUnits).toBe(575);
    expect(cut.totalNettoMw).toBeCloseTo(4620.459, 2);
    expect(cut.sites).toHaveLength(545);
    expect(cut.mappedNettoMw).toBeCloseTo(4462.459, 2);
    expect(cut.unmappedUnits).toBe(5);
    expect(cut.unmappedNettoMw).toBeCloseTo(158.0, 2);
    expect(cut.unmappedBruttoMw).toBeCloseTo(158.5, 2);

    const uniqueLok = new Set(data.einheiten.map((e) => e.lok));
    expect(uniqueLok.size).toBe(550);
    expect(cut.sites[0]!.nettoMw).toBeCloseTo(140.0, 2);
  });

  it("prüft Filter: nur NB-geprüft (345 Einheiten / 2.191,15 MW)", () => {
    const filtered = filterEinheiten(data.einheiten, {
      nurGeprueft: true,
      einspeisung: "alle",
    });
    expect(filtered).toHaveLength(345);
    const sumNetto = filtered.reduce((s, e) => s + e.nettoMw, 0);
    expect(sumNetto).toBeCloseTo(2191.15, 2);
  });

  it("prüft Einspeisungsfilter: voll, teil, ohne (ohne nur unter Alle)", () => {
    const voll = filterEinheiten(data.einheiten, {
      nurGeprueft: false,
      einspeisung: "voll",
    });
    const teil = filterEinheiten(data.einheiten, {
      nurGeprueft: false,
      einspeisung: "teil",
    });
    const alle = filterEinheiten(data.einheiten, {
      nurGeprueft: false,
      einspeisung: "alle",
    });
    const ohne = data.einheiten.filter((e) => e.einspeisung === "ohne");

    expect(voll).toHaveLength(461);
    expect(voll.reduce((s, e) => s + e.nettoMw, 0)).toBeCloseTo(4197.4, 1);

    expect(teil).toHaveLength(109);
    expect(teil.reduce((s, e) => s + e.nettoMw, 0)).toBeCloseTo(401.5, 1);

    expect(ohne).toHaveLength(5);
    expect(ohne.reduce((s, e) => s + e.nettoMw, 0)).toBeCloseTo(21.6, 1);

    expect(alle).toHaveLength(voll.length + teil.length + ohne.length);
  });

  it("prüft Zeitachse-Kontrollwerte Ende 2022 und Ende 2024", () => {
    const cut2022 = sitesAtCut(data.einheiten, "2022-12");
    expect(cut2022.totalNettoMw).toBeCloseTo(1094.057, 2);

    const cut2024 = sitesAtCut(data.einheiten, "2024-12");
    expect(cut2024.totalNettoMw).toBeCloseTo(1756.973, 2);

    const monate = data.monatKumuliert.map((m) => m.monat);
    const kurve = computeKumulierteKurve(data.einheiten, monate);
    const m2022 = kurve.find((m) => m.monat === "2022-12")!;
    const m2024 = kurve.find((m) => m.monat === "2024-12")!;
    expect(m2022.kumNettoMw).toBeCloseTo(1094.057, 2);
    expect(m2024.kumNettoMw).toBeCloseTo(1756.973, 2);
  });

  it("wendet die Säulenregel exakt an (Koordinate der leistungsstärksten Einheit, Summe der Lokation)", () => {
    const sample = [
      {
        lok: "LOK1",
        name: "Klein",
        bl: "BY",
        lk: "A",
        lat: 48.0,
        lng: 11.0,
        ibn: "2022-01-10",
        nettoMw: 5,
        bruttoMw: 6,
        kapMwh: 10,
        geprueft: true,
        einspeisung: "voll" as const,
        span: "Mittelspannung",
      },
      {
        lok: "LOK1",
        name: "Gleichstand-HoeherBrutto",
        bl: "BY",
        lk: "A",
        lat: 48.5,
        lng: 11.5,
        ibn: "2023-05-01",
        nettoMw: 10,
        bruttoMw: 12,
        kapMwh: 20,
        geprueft: true,
        einspeisung: "voll" as const,
        span: "Hochspannung",
      },
      {
        lok: "LOK1",
        name: "Gleichstand-NiedrigerBrutto",
        bl: "BY",
        lk: "A",
        lat: 48.9,
        lng: 11.9,
        ibn: "2023-06-01",
        nettoMw: 10,
        bruttoMw: 10,
        kapMwh: 15,
        geprueft: false,
        einspeisung: "teil" as const,
        span: "Hochspannung",
      },
    ];
    const res = sitesAtCut(sample, "2024-12");
    expect(res.sites).toHaveLength(1);
    const site = res.sites[0]!;
    expect(site.lat).toBe(48.5);
    expect(site.lng).toBe(11.5);
    expect(site.nettoMw).toBe(25);
    expect(site.kapMwh).toBe(45);
    expect(site.unitsCount).toBe(3);
    expect(site.einspeisung).toBe("gemischt");
    expect(site.geprueftAlle).toBe(false);

    // Vor 2023 zählt nur die 5-MW-Einheit mit ihrer Koordinate
    const res2022 = sitesAtCut(sample, "2022-12");
    expect(res2022.sites[0]!.lat).toBe(48.0);
    expect(res2022.sites[0]!.nettoMw).toBe(5);
  });

  it("skaliert Säulenhöhe mit √(Wert) und leitet MWh-Referenzen aus den Daten ab", () => {
    expect(saeulenHoehe(140, 140, 100)).toBeCloseTo(100, 5);
    expect(saeulenHoehe(35, 140, 100)).toBeCloseTo(50, 5);
    expect(saeulenHoehe(0, 140, 100)).toBe(0);
    expect(punktRadius2d(140, 140, 3, 20)).toBeCloseTo(20, 5);

    const cut = sitesAtCut(data.einheiten, "2026-11");
    const mwhRefs = deriveMwhReferenzWerte(cut.sites, data.meta.hoehenReferenzMw);
    expect(mwhRefs.length).toBeGreaterThanOrEqual(3);
    expect(mwhRefs[mwhRefs.length - 1]).toBe(282);
    for (let i = 1; i < mwhRefs.length; i += 1) {
      expect(mwhRefs[i]!).toBeGreaterThan(mwhRefs[i - 1]!);
    }
  });

  it("liefert alle 16 Bundesländer nach Netto sortiert und behält null für HH/BE Abregelung", () => {
    const bl = blNetto(data.bundeslaender);
    expect(bl).toHaveLength(16);
    expect(bl[0]!.kuerzel).toBe("BY");
    const sumNetto = bl.reduce((s, r) => s + r.nettoMw, 0);
    expect(sumNetto).toBeCloseTo(4620.459, 1);

    const hh = bl.find((r) => r.kuerzel === "HH")!;
    const be = bl.find((r) => r.kuerzel === "BE")!;
    expect(hh.abregelung2025Gwh).toBeNull();
    expect(be.abregelung2025Gwh).toBeNull();
  });

  it("berechnet E/P und projiziert 3D-Quader mit genau 2 sichtbaren Seitenflächen", () => {
    expect(epStunden(200, 100)).toBeCloseTo(2, 5);
    expect(isEpPlausibel(2, data.meta.epPlausibelH)).toBe(true);
    expect(isEpPlausibel(0.1, data.meta.epPlausibelH)).toBe(false);
    expect(isEpPlausibel(12, data.meta.epPlausibelH)).toBe(false);

    const cam = clampCamera3d({ yawDeg: 400, tiltDeg: 95, zoom: 5 });
    expect(cam.yawDeg).toBeCloseTo(40, 5);
    expect(cam.tiltDeg).toBe(76);
    expect(cam.zoom).toBe(1.85);

    const params = createProjectionParams3d(DEFAULT_CAMERA_3D, 800, 600);
    const p = geoToPlane(10.0, 51.0);
    const cuboid = projectCuboid(p.x, p.y, 0.012, 0.3, params);
    expect(cuboid.visibleSides).toHaveLength(2);
    expect(cuboid.topCenter.y).toBeLessThan(cuboid.baseCenter.y);
  });
});

describe("mastrNameNbsp", () => {
  it("bindet Zahl und Einheit mit NBSP, lässt Rest unverändert", async () => {
    const { mastrNameNbsp } = await import("@/lib/bessKarte3d/logic");
    expect(mastrNameNbsp("BESS 5.000 kW")).toBe("BESS 5.000\u00a0kW");
    expect(mastrNameNbsp("Speicher 2 MWh Nord")).toBe("Speicher 2\u00a0MWh Nord");
    expect(mastrNameNbsp("Park 3 Kwartier")).toBe("Park 3 Kwartier");
    expect(mastrNameNbsp("Batterie Halle 4")).toBe("Batterie Halle 4");
  });
});
