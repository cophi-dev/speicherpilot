# Abnahme — Premium-Lauf, 9. November 2026

Lokaler Produktionsbuild (`next build` + `next start`) gegen denselben Datenstand wie die Live-Seite. Vorher: Live-Seite auf `main` (`dfb2f88`). Keine Datei mit Rechenlogik unter `lib/` geändert.

## Kernzahlen unverändert

Skript: [`scripts/kernzahlen-premium-20261109.mjs`](../../scripts/kernzahlen-premium-20261109.mjs). Es liest den sichtbaren Text von `main` (alle Klappen geöffnet) und zählt jede Zahl mit Einheit (GWh, GW, MW, %, €/MWh, Tage). Vorher [`kernzahlen-vorher.json`](kernzahlen-vorher.json), nachher [`kernzahlen-nachher.json`](kernzahlen-nachher.json). Ergebnis: **keine Zahl fehlt auf keiner Seite**, kein Euro-Zeichen außer €/MWh-Börsenpreis.

| Seite | Werte, vorher = nachher | Neu sichtbar |
| --- | --- | --- |
| `/` (8.11.2026) | Verbrauch 1.275,1 GWh, Erzeugung 1.417,5 GWh, Wind+Sonne 184,9 GWh, Überschuss 0,0 GWh; Modell ×1 4,64 GW / 8,14 GWh, geladen 0,0, abgegeben 0,0 GWh; 30 Tage 28 % (×1), 75 % (×5), 100 % (×10), 32,6 von 115,6 GWh | Skala „61,1 GWh“ an der Leiste, Schwelle „0,05 GWh“ in Anmerkung 1 |
| `/tag/2026-11-08` | 14,5 %, Abendspitze 58,5 GW, 62,1 GW Verbrauch, 3,5 GW Wind+Sonne, 206–322 €/MWh | – |
| `/tag/2026-10-24` | 61,1 GWh, integriert 61,10 GWh, Restlast 17,84 GW, Abgabe 10,22 GWh | – |
| `/tag/2026-10-25` | 9,6 GWh, Restlast 8,3 GW | – |
| `/monat/2026-10` ×1 Differenz | Spitze 62,16 GW, Senkung 2,24 GW, 3,5 % gegen 64,41 GW, Ladung 55,90 GWh, Abgabe 47,52 GWh | Modellannahmen jetzt auch auf Desktop (4,58 GW / 8 GWh, 85 %, 10–90 %) |
| `/monat/2026-10` ×5 Spitze | alle Werte gleich | wie oben |

## Tests, Lint, Build

- Jest: 144 Suiten bestanden, 3 übersprungen; 638 Tests grün.
- ESLint: 0 Fehler. 39 Warnungen, identisch mit `main` (keine neue).
- `npm run build`: grün.

## Lighthouse, lokaler Build (12.6.1)

| Route | Form | Performance | Barrierefreiheit | SEO |
| --- | --- | --- | --- | --- |
| `/` | mobil | 92 | 100 | 100 |
| `/` | Desktop | 100 | 100 | 100 |
| `/tag/2026-11-08` | mobil | 92 | 100 | 100 |
| `/monat/2026-10` | mobil | 92 | 100 | 100 |

## Bilder

Vorher, Live: [`screens/vorher/`](screens/vorher/). Nachher, lokaler Build: [`screens/nachher/`](screens/nachher/). Je Seite 1440 und 390 px, hell und dunkel, erster Bildschirm (`-fold`) und ganze Seite (`-full`).
