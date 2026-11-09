# Abnahme Paket 2 — 9. November 2026

Maßnahmen 5 und 6 aus [`PLAN.md`](PLAN.md). Rechenkern, Abruf und Modell unverändert. Nicht gemergt, nicht deployed.

Die orangefarbene Linie ist der Falz: 900 px bei 1440, 844 px bei 390. Die Bilder sind etwas höher als das Fenster, damit die Linie im Bild liegt. Gemessen wurde die Kurvenoberkante im Fenster 1440×900 bzw. 390×844.

## Kurve im ersten Fenster

| Seite | Fenster | Kurvenoberkante vorher | nachher |
| --- | --- | --- | --- |
| `/monat/2026-10` | 1440×900 dunkel | 1025 px | 586 px |
| `/monat/2026-10` | 390×844 hell | 1432 px | 806 px |
| `/ort` | 1440×900 dunkel | 969 px | 558 px |
| `/ort` | 390×844 hell | 954 px | 553 px |

`scrollWidth` bei 390 px ist 390, hell und dunkel, auf beiden Seiten.

### Vorher

![Monat 1440 dunkel, vorher](screens/paket2/vorher/monat-1440-dark.png)

![Monat 390 hell, vorher](screens/paket2/vorher/monat-390-light.png)

![Ort 1440 dunkel, vorher](screens/paket2/vorher/ort-1440-dark.png)

![Ort 390 hell, vorher](screens/paket2/vorher/ort-390-light.png)

### Nachher

![Monat 1440 dunkel, nachher](screens/paket2/nachher/monat-1440-dark.png)

![Monat 390 hell, nachher](screens/paket2/nachher/monat-390-light.png)

![Ort 1440 dunkel, nachher](screens/paket2/nachher/ort-1440-dark.png)

![Ort 390 hell, nachher](screens/paket2/nachher/ort-390-light.png)

## Was sich verschoben hat

Auf `/monat` bleiben Spitze, Ladung und Abgabe über der Kurve. Auf dem Desktop stehen die drei Werte in einer Zeile. Sätze ohne die Kennzahl — Monatslauf, Modellannahmen, Quellenzeile, „nicht dasselbe wie vollständiger Speicher-Nutzen“ — stehen unter der Kurve als Definitionsliste, 13 px, Link auf `/methodik#grossspeicher`.

Auf `/ort` bleibt der Befundsatz über der Anschlusskurve. Größe und Abspielen bleiben darüber. „Der Speicher wartet …“ und „Speicher am Anschlusspunkt …“ stehen darunter, gleiche Listenform, Link auf `/methodik`. Projektierer und Netzbetreiber sind unverändert getrennt. Die Badge-Regel v1 ist nicht angefasst.

## Dieselben Zahlen

Oktober ×1, Differenz aufnehmen, Text vorher (live, main `dfb2f88`) und nachher identisch:

- Spitze 62,16 GW
- Senkung 2,24 GW (3,5 % zur Referenzspitze 64,41 GW)
- Ladung 55,90 GWh
- Abgabe 47,52 GWh

`/ort` Projektierer, Größe S: 0,8 MW. Amortisation ≈ 34,6 Jahre (23,8–63,6). Benutzungsdauer 600 h → 632 h. Netzentgelt ≈ 1.443 €/Jahr (1.010–1.876). Arbitrage ≈ 9.526 €/Jahr (6.668–12.383).

`/ort?sicht=netz`, Land, Markt: Badge belastend (Modell). Fest/flexibel 0,0 / 17,0 MW. Modellerlös 100,0 %. Viertelstunden über 100 %: ohne Speicher 31, mit Speicher 29. Engpass max 117,2 %.

## Lighthouse

Produktionsserver, lokal. Mobil 390×844, Desktop Preset.

| Seite | Performance | Accessibility | Best Practices | SEO | CLS |
| --- | --- | --- | --- | --- | --- |
| `/monat` mobil | 91 | 100 | 100 | 100 | 0 |
| `/monat` Desktop | 100 | 100 | 100 | 100 | 0 |
| `/ort` mobil | 86 | 100 | 100 | 100 | 0 |
| `/ort` Desktop | 100 | 100 | 100 | 100 | 0 |

## Tests

`pnpm test`: 144 Suites bestanden, 3 übersprungen, 637 Tests bestanden. ESLint auf den geänderten Dateien: 0 Fehler. `pnpm build`: erfolgreich.
