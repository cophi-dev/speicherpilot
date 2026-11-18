import manifest from "@/data/knoten/manifest.json";

import { knotenHrefFromTagDay } from "@/lib/knoten/knotenTagLink";
import type { KnotenManifest } from "@/lib/knoten/knotenTypes";

const M = manifest as KnotenManifest;

describe("knotenHrefFromTagDay", () => {
  it("verlinkt Tag im Fenster direkt", () => {
    expect(knotenHrefFromTagDay("2026-11-13", M)).toBe("/knoten?tag=2026-11-13");
  });

  it("verlinkt August auf nächstliegenden Sommer-Tag", () => {
    expect(knotenHrefFromTagDay("2026-08-15", M)).toBe("/knoten?tag=2026-07-31");
  });

  it("liefert /knoten ohne Datum außerhalb der Jahresfenster", () => {
    expect(knotenHrefFromTagDay("2025-01-01", M)).toBe("/knoten");
  });
});