# Paket 3 — Abschlussbericht

Stand: 9. November 2026, Branch `cursor/paket3-award-alle-ebenen-048c`, PR [#81](https://github.com/cophi-dev/speicherpilot/pull/81) (Korrekturrunde, nicht gemergt). Zielbild: [`ZIELBILD.md`](ZIELBILD.md).

## Umsetzung

1. **Drei-Ziele-Vergleich** auf `/monat/2026-10` (`data-testid="three-goals-compare"`): Akzent + Graustufen, Y-Ticks, Referenzlabel frei, sr-only-Tabelle, Fußnote mit deutschem Datum **21.10.2026**.
2. **Markt-Insights**: Regel „hohes Minimum“ einheitlich **100 €/MWh** (Schwelle, Text, Methodik); Monat: Insights als kurze `dl` unter der Kurve.
3. **Methodik `#insights`**: je Regel Fußnoten-Liste (Formel, Daten/Zeitraum, Quelle, Gegenrechnung/Grenzfall).
4. **/ort**: `OrtUnbHinweis` mit **Art. 50 Abs. 4a VO (EU) 2019/943**, Link `#netzkapazitaet-unb`.
5. **Layout**: Mobil Monatskurve vor Steuerung; `v4-three-goals-slot` reserviert Höhe; JetBrains-Mono-Alias `--font-jetbrains-mono`.

## Kernzahlen

Unverändert gegenüber [`../kernzahlen-vorher.json`](../kernzahlen-vorher.json). Drei-Ziele-KPIs aus Bundle (Oktober ×1 Markt 485 GWh Ladung usw.).

Tests: 659 grün (13 skipped). Lint: 0 Fehler. Build: grün.

## Lighthouse (lokal, `pnpm start -p 3001`, Korrektur)

Siehe [`lighthouse-summary.json`](lighthouse-summary.json).

| Route | Mobil Perf / a11y | Desktop Perf / a11y | Desktop CLS |
| --- | --- | --- | --- |
| `/monat/2026-10` | 94 / 96 | 100 / 96 | **0,013** (Ziel &lt; 0,1) |
| `/` | 94 / 97 | 100 / 97 | 0 |
| `/tag/2026-11-08` | 90 / 95 | 97 / 95 | 0,108 |
| `/ort` | **81** / 96 | 85 / 96 | 0,303 |
| `/methodik` | 91 / 96 | 82 / 96 | 0,363 |

**/ort mobil Performance** weiter unter 90 (bestehendes SimBench-Bundle); Paket-3-UI ist überwiegend statisch. Kein Overflow bei 390 px (Abnahmeskript).

## Artefakte

| Typ | Pfad |
| --- | --- |
| Vollseiten | [`screens/nachher/`](screens/nachher/), [`screens/vorher/`](screens/vorher/) |
| **Kontroll-Crops PR81** | [`screens/kontrolle/`](screens/kontrolle/) — Monat 1440 dunkel (Drei-Ziele), Monat 390 hell (erstes Fenster), Ort 390 hell (ÜNB) |

Manifest: [`manifest.json`](manifest.json). Abnahme: `node scripts/paket3-abnahme.mjs` (Server auf Port 3001).

## Nicht enthalten

Kein Merge, kein Deploy.
