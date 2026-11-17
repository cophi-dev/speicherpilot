# Restliste PR #124 — Fix-Bericht

**Branch:** `fix/restliste-124`  
**Basis:** `main` (c6220dc)

## Echte Kollisionen (Messung vor Fix)

| Gemeldet | Echt? | Fix |
|----------|-------|-----|
| GW ↔ Tick „100“ (Restlast-Chart) | **Ja** | Einheit links oben neben Ticks (`yAxisGwUnitPosition`) |
| Kipppunkt ≈×3,9 auf Beobachtet-Linie (1280) | **Ja** | Legende statt Inline-Label |
| −13,98 GW an „genauso stark“ (1280) | **Ja** | Punktlabels entfernt; Vergleich in Legende |
| Spitze / Überschuss auf Kurven (schmal) | **Ja** | Legende + Tooltip |
| Markt-Linie ↔ „ohne Preisrückwirkung“ (schmal) | **Ja** | Legende |
| Regler „beobachtet“ ↔ Polylinie | **Nein** (keine BBox-Überlappung nach Kontrast-Fix) |

## Messwerte (Hellmodus, Playwright)

`minTypo` über alle Chart-SVG-Texte in Scope; Kollisionen = überlappende Text-BBoxen je Chart-SVG; Overflow = `scrollWidth > clientWidth` (Seite + Chart-Wrapper).

| Route | 1280 | 1024 | 768 | 390 |
|-------|------|------|-----|-----|
| `/` | minTypo ≥12, Koll. 0, Overflow nein | ≥12, 0, nein | ≥12, 0, nein | ≥12, 0, nein |
| `/tag/2026-11-15` | ≥12, 0, nein | ≥12, 0, nein | ≥12, 0, nein | ≥12, 0, nein |
| `/monat` | ≥12, 0, nein; Kontrast beobachtet ≥4,5 | wie 1280 | wie 1280 | wie 1280 |
| `/monat/2026-10` | ≥12, 0, nein; Kontrast beobachtet ≥4,5 | wie 1280 | wie 1280 | wie 1280 |

Screenshots: `review-artifacts/restliste-124/` (Fold 1280/390; Restlast-Hero 1024: `monat-restlast-chart-1024.png`).

## Tests

- Unit: `lib/monatV1HeroLayout.test.ts`, `lib/monatReglerContrast.test.ts`, `lib/tagSvgTypography.test.ts`
- E2E (mit `RUN_BROWSER_TESTS=1`): `e2e/restliste-124-chart-audit.test.ts`, `e2e/monat-svg-type.test.ts`