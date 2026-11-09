# Paket 3 — Abschlussbericht

Stand: 9. November 2026, Branch `cursor/paket3-award-alle-ebenen-048c`. Zielbild: [`ZIELBILD.md`](ZIELBILD.md).

## Umsetzung

1. **Drei-Ziele-Vergleich** auf `/monat/2026-10` als eigenes Kapitel vor dem bestehenden Monatslauf (`data-testid="three-goals-compare"`). Daten aus `fleet-month-meta.json` / Läufen; Fußnote Markt ×10 aus Viertelstunde 21.10.2026 14:00 (96,76 GW, 201,29 €/MWh).
2. **Markt-Insights** als kompakter Block auf `/`, `/tag`, `/monat`, `/ort`, `/beitraege`; neun Regeln dokumentiert unter `/methodik#insights`.
3. **Award-Politur**: Typo ≥12 px, Touch-Targets (Disclosure, Regel-Links), Größere Chart-Balken, konsistente Fußnoten. 25-Hero, Tagesgraph, dunkler Look unverändert.
4. **/ort**: ÜNB-Hinweis mit externen Links, **keine Netzkarte** (`OrtUnbHinweis`).

## Kernzahlen

Vergleich mit [`../kernzahlen-vorher.json`](../kernzahlen-vorher.json). **Unverändert** (nur neue Vergleichs-KPIs im Oktober-Chart).

| Stelle | Vorher | Nachher |
| --- | --- | --- |
| Start 8.11. Verbrauch / Überschuss | 1.275,1 / 0,0 GWh | gleich |
| Start 30 Tage ×1 | 28 %, 32,6 von 115,6 GWh | gleich |
| Tag 8.11. Abendspitze | 58,5 GW | gleich |
| Oktober ×1 Differenz | −2,24 GW, 55,90 GWh Ladung | gleich (Chart ×1-Spalte) |
| **Neu** | — | Drei-Ziele-Vergleich ×1–×10 für alle Fahrweisen (GW/GWh aus Bundle) |

Tests: 658 grün (13 skipped). Lint: 0 Fehler. Build: grün.

## Lighthouse (lokal, `pnpm start -p 3001`)

Siehe [`lighthouse-summary.json`](lighthouse-summary.json). CLS überall 0 (Methodik Desktop 0,004).

| Route | Mobil Perf | Mobil a11y | Desktop |
| --- | --- | --- | --- |
| `/` | 92 | 100 | 100 / 100 |
| `/tag/2026-11-08` | 92 | 100 | 100 / 100 |
| `/monat/2026-10` | 92 | 100 | 100 / 100 |
| `/ort` | **84** | 100 | 100 / 100 |
| `/methodik` | 90 | 100 | 100 / 100 |

**/ort mobil Performance:** 84 — dominiert durch die bestehende `OrtSiteDayClient`-Bundling (SimBench/pandapower); Paket-3-Änderungen sind statischer Text. Kein Overflow bei 390 px (Abnahmeskript).

## Artefakte

| Vorher (Baseline aus `../screens/`) | Nachher |
| --- | --- |
| [`screens/vorher/`](screens/vorher/) | [`screens/nachher/`](screens/nachher/) |

Je Route: `*-1440-dark.png`, `*-390-light.png`. Manifest: [`manifest.json`](manifest.json).

## Nicht enthalten

Kein Merge, kein Deploy, kein Share-Button, keine Netzkarte, keine erfundenen MW-Werte.
