# Abnahme — Darstellung, nicht Rechnung

Lokaler Produktionsbuild gegen denselben Datenstand wie die Live-Seite am 9. November 2026. Commit der Live-Seite vor dieser Änderung: `8b00bc0`.

## Kernzahlen unverändert

Quelle vorher: Live-HTML, [`kernzahlen-vorher.json`](kernzahlen-vorher.json). Nachher: derselbe Text im lokalen Build. Alle gesuchten Werte sind vorhanden, auf der Startseite steht kein Euro-Zeichen, die Formel steht hinter den Kennzahlen.

| Stelle | Wert, vorher = nachher |
| --- | --- |
| Start, 8.11.2026 | Verbrauch 1.275,1 GWh, Erzeugung 1.417,5 GWh, Wind+Sonne 184,9 GWh, Überschuss 0,0 GWh |
| Start, Modell ×1 | 4,64 GW / 8,14 GWh, geladen 0,0 GWh, abgegeben 0,0 GWh |
| Start, 30 Tage | 28 % bei ×1, 75 % bei ×5, 100 % bei ×10, 32,6 von 115,6 GWh |
| Tag 8.11.2026 | 14,5 % Wind+Sonne, unter 0,05 GWh, Abendspitze 58,5 GW |
| Tag 25.10.2026 | 9,6 GWh, integriert 9,64 GWh, Ladung/Abgabe 9,01 / 2,51 GWh, Restlast 8,27 GW |
| Tag 24.10.2026 | 61,1 GWh, integriert 61,10 GWh, Ladung/Abgabe 11,37 / 10,22 GWh, Restlast 17,84 GW |
| Monat Oktober, ×1, Differenz | Spitze 62,16 GW, Senkung 2,24 GW (3,5 % gegen 64,41 GW), Ladung 55,90 GWh, Abgabe 47,52 GWh |

Tests: 144 bestanden, 3 übersprungen, 635 Tests grün. Lint: 0 Fehler. Build: grün.

## Lighthouse, lokaler Build

| Route | Form | Performance | Barrierefreiheit | SEO |
| --- | --- | --- | --- | --- |
| `/` | mobil 390 | 93 | 100 | 100 |
| `/` | Desktop | 100 | 100 | 100 |
| `/tag/2026-11-08` | mobil 390 | 92 | 100 | 100 |
| `/monat/2026-10` | mobil 390 | 91 | 100 | 100 |

Der Überschuss-Akzent im Hellen ist dafür einen Ton dunkler (`#c2410c` auf `#f6f6f3`). Im Dunkeln bleibt `#e86a3a`.

## Bilder

Vorher, Live: [`screens/`](screens/). Nachher, lokaler Build: [`screens/nachher/`](screens/nachher/).
