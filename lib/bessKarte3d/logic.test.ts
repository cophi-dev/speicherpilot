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
      vnb: null,
    });
    expect(filtered).toHaveLength(345);
    const sumNetto = filtered.reduce((s, e) => s + e.nettoMw, 0);
    expect(sumNetto).toBeCloseTo(2191.15, 2);
  });

  it("prüft Einspeisungsfilter: voll, teil, ohne (ohne nur unter Alle)", () => {
    const voll = filterEinheiten(data.einheiten, {
      nurGeprueft: false,
      einspeisung: "voll",
      vnb: null,
    });
    const teil = filterEinheiten(data.einheiten, {
      nurGeprueft: false,
      einspeisung: "teil",
      vnb: null,
    });
    const alle = filterEinheiten(data.einheiten, {
      nurGeprueft: false,
      einspeisung: "alle",
      vnb: null,
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
    expect(cam.zoom).toBe(5);

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

describe("VNB-Filter und Abregelung ohne Offshore (Export 25.11 13:03)", () => {
  it("jede Einheit hat einen VNB, je Lokation identisch (550/550)", async () => {
    const karte = (await import("@/data/bess-karte-3d/karte3d.json")).default as unknown as {
      einheiten: Array<{ lok: string; vnb?: string; nettoMw: number }>;
      vnbJeLokation: Record<string, string>;
    };
    expect(karte.einheiten.every((e) => typeof e.vnb === "string" && e.vnb.length > 0)).toBe(true);
    expect(Object.keys(karte.vnbJeLokation)).toHaveLength(550);
    for (const e of karte.einheiten) expect(karte.vnbJeLokation[e.lok]).toBe(e.vnb);
  });

  it("filtert auf einen Netzbetreiber; MITNETZ 723,5 MW netto", async () => {
    const { vnbOptionen, filterEinheiten: f } = await import("@/lib/bessKarte3d/logic");
    const karte = (await import("@/data/bess-karte-3d/karte3d.json")).default as never as {
      einheiten: Parameters<typeof f>[0];
    };
    const opts = vnbOptionen(karte.einheiten);
    expect(opts[0]!.label).toBe("Mitteldeutsche Netzgesellschaft Strom mbH");
    const sel = f(karte.einheiten, { nurGeprueft: false, einspeisung: "alle", vnb: opts[0]!.vnb });
    expect(sel.reduce((s, e) => s + e.nettoMw, 0)).toBeCloseTo(723.49, 1);
  });

  it("Flächenwert = Gesamt minus Wind Offshore (6.036,02 GWh; SH 742,98, NI 845,04, MV 188,82)", async () => {
    const { abregelungOhneOffshore } = await import("@/lib/bessKarte3d/logic");
    const karte = (await import("@/data/bess-karte-3d/karte3d.json")).default as never as {
      bundeslaender: Array<Parameters<typeof abregelungOhneOffshore>[0]>;
    };
    const by = Object.fromEntries(karte.bundeslaender.map((b) => [b.kuerzel, abregelungOhneOffshore(b)]));
    expect(by.SH).toBeCloseTo(742.98, 2);
    expect(by.NI).toBeCloseTo(845.04, 2);
    expect(by.MV).toBeCloseTo(188.82, 2);
    expect(by.HH).toBeNull();
    expect(by.BE).toBeNull();
    const sum = Object.values(by).reduce<number>((s, v) => s + (v ?? 0), 0);
    expect(sum).toBeCloseTo(6036.02, 1);
  });
});

describe("mobilMindestPunktWert", () => {
  it("Mindestradius entspricht ≈ 3 MW bei 140 MW Skalenmaximum", () => {
    const { mobilMindestPunktWert } = jest.requireActual("./logic") as typeof import("./logic");
    expect(mobilMindestPunktWert(140)).toBeCloseTo(3.2, 1);
    expect(mobilMindestPunktWert(0)).toBe(0);
  });
});

describe("Zoom und Verschieben (projection3d)", () => {
  it("unprojectGround kehrt projectPoint3d um, Zoom hält den Punkt unter dem Cursor fest", async () => {
    const pr = await import("@/lib/bessKarte3d/projection3d");
    const cam = { ...pr.DEFAULT_CAMERA_3D, zoom: 2.3, panX: 0.1, panY: -0.2 };
    const params = pr.createProjectionParams3d(cam, 1200, 800);
    const plane = pr.geoToPlane(13.4, 52.5);
    const s = pr.projectPoint3d(plane.x, plane.y, 0, params);
    const back = pr.unprojectGround(s.x, s.y, params)!;
    expect(back.x).toBeCloseTo(plane.x, 6);
    expect(back.y).toBeCloseTo(plane.y, 6);

    const zoomed = pr.zoomCameraAt(cam, 2, s.x, s.y, 1200, 800);
    expect(zoomed.zoom).toBeCloseTo(4.6, 6);
    const s2 = pr.projectPoint3d(plane.x, plane.y, 0, pr.createProjectionParams3d(zoomed, 1200, 800));
    expect(s2.x).toBeCloseTo(s.x, 3);
    expect(s2.y).toBeCloseTo(s.y, 3);

    expect(pr.clampCamera3d({ ...cam, zoom: 99 }).zoom).toBe(pr.ZOOM_MAX);
    const panned = pr.panCameraBy(cam, 40, 0, 1200, 800);
    const s3 = pr.projectPoint3d(plane.x, plane.y, 0, pr.createProjectionParams3d(panned, 1200, 800));
    expect(Math.abs(s3.x - s.x - 40)).toBeLessThan(8);
  });
});

describe("computeKarteKernzahlen", () => {
  it("55 Lokationen = 48 %, Zubau 2025/26 = 62 % (Vorgabe speicherpilot 13:34)", async () => {
    const { computeKarteKernzahlen } = await import("@/lib/bessKarte3d/kernzahlen");
    const k = computeKarteKernzahlen(data.einheiten);
    expect(k.lokationen).toBe(550);
    expect(k.topLokationen).toBe(55);
    expect(Math.round(k.topAnteilPct)).toBe(48);
    expect(k.topMinMw).toBeGreaterThanOrEqual(17);
    expect(Math.round(k.zubauAnteilPct)).toBe(62);
    expect(k.zubauJahre.map((z) => z.jahr)).toEqual([2025, 2026]);
  });
});

describe("mobile projection fit (390-Karte)", () => {
  it("passt Deutschland inkl. Schleswig-Holstein in 350×490 ein, Norden oben, Neigung 16°", async () => {
    const pr = await import("@/lib/bessKarte3d/projection3d");
    expect(pr.MOBILE_CAMERA_3D.tiltDeg).toBeLessThanOrEqual(20);
    expect(pr.MOBILE_CAMERA_3D.yawDeg).toBe(0);

    const w = 350;
    const h = 490;
    const params = pr.createProjectionParams3d(pr.MOBILE_CAMERA_3D, w, h, "mobile");
    const inside = (lng: number, lat: number) => {
      const plane = pr.geoToPlane(lng, lat);
      const p = pr.projectPoint3d(plane.x, plane.y, 0, params);
      expect(p.x).toBeGreaterThan(8);
      expect(p.x).toBeLessThan(w - 8);
      expect(p.y).toBeGreaterThan(8);
      expect(p.y).toBeLessThan(h - 8);
      return p;
    };
    const flensburg = inside(9.44, 54.79);
    const sylt = inside(8.29, 55.02);
    const oberstdorf = inside(10.29, 47.41);
    const selfkant = inside(5.92, 51.02);
    const goerlitz = inside(15.0, 51.16);
    expect(flensburg.y).toBeLessThan(oberstdorf.y);
    expect(sylt.y).toBeLessThan(flensburg.y);
    expect(goerlitz.x).toBeGreaterThan(selfkant.x);
    const span = goerlitz.x - selfkant.x;
    expect(span).toBeGreaterThan(300);
  });

  it("Desktop-Projektion bleibt unverändert, wenn fit fehlt", async () => {
    const pr = await import("@/lib/bessKarte3d/projection3d");
    const a = pr.createProjectionParams3d(pr.DEFAULT_CAMERA_3D, 1280, 800);
    const b = pr.createProjectionParams3d(pr.DEFAULT_CAMERA_3D, 1280, 800, "default");
    expect(a.scale).toBeCloseTo(b.scale, 8);
    expect(a.cx).toBeCloseTo(b.cx, 8);
    expect(a.cy).toBeCloseTo(b.cy, 8);
    expect(a.cy).toBeCloseTo(800 * 0.56, 8);
    expect(a.scale).toBeCloseTo(Math.min(1280, 800) * 0.47 * pr.DEFAULT_CAMERA_3D.zoom, 8);
  });
});

describe("previewSitesAtMonat", () => {
  it("summiert nur Einheiten bis zum Schnittmonat", async () => {
    const { previewSitesAtMonat } = await import("@/lib/bessKarte3d/logic");
    const sites = [
      {
        lok: "A",
        lat: 52,
        lng: 13,
        nettoMw: 30,
        units: [
          { ibnMonat: "2023-06", nettoMw: 10 },
          { ibnMonat: "2025-01", nettoMw: 20 },
        ],
      },
      {
        lok: "B",
        lat: 48,
        lng: 11,
        nettoMw: 5,
        units: [{ ibnMonat: "2026-01", nettoMw: 5 }],
      },
    ];
    expect(previewSitesAtMonat(sites, "2023-12")).toEqual([
      { lok: "A", lat: 52, lng: 13, nettoMw: 10 },
    ]);
    expect(previewSitesAtMonat(sites, "2025-06").map((s) => [s.lok, s.nettoMw])).toEqual([
      ["A", 30],
    ]);
    expect(previewSitesAtMonat(sites, "2026-11").map((s) => [s.lok, s.nettoMw])).toEqual([
      ["A", 30],
      ["B", 5],
    ]);
  });
});
