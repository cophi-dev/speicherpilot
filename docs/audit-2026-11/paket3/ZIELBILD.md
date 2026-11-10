# Zielbild Paket 3 — Award auf allen Ebenen

Stand 9. November 2026. Ableitung aus Briefing, [`KONZEPT.md`](../konzept/KONZEPT.md) und [`AUDIT2.md`](../konzept/AUDIT2.md). Bestehende Träger bleiben: Hero „25“, Tagesgraph, Oktober-Monatskurve, dunkles Blatt.

## Start `/`

**Erster Blick:** Die 25 und das Lücken-Bild bleiben. Darunter derselbe Tag als Last, Wind+Sonne und Börsenlinie (bereits Paket 1). Neu: kompakter Block „Markt-Insights“ mit zwei bis drei Regeln aus dem 30-Tage-Fenster (Trockenstrecke, hohes Mindestpreisniveau, Flotte vs. Abendspitze) — Zahl, Zeitraum, Quelle, Link `#insights`.

**Figur:** Ein Graph pro Seite (25-Balken + Tagesgraph + Preisfenster). Kein neuer Hero.

## Tag `/tag/[datum]`

**Erster Blick:** Auffälligkeit des Tages bleibt Überschrift. Residuallast-Graph und Preisfenster erzählen Überschuss, Börse und Abendspitze am selben Tag. Insights-Block: regelbasierte Sätze für diesen Tag (hohes Minimum ohne Ladefenster, Spike-Tag, Flotte gegen Spitze).

**Figur:** Residuallast-Kurve + Day-Ahead-Linie; keine Euro-Skalierung mit Faktor.

## Monat `/monat/2026-10`

**Herzstück:** Drei Ziele (Differenz / Spitze / Markt) nebeneinander für ×1, ×2, ×5, ×10 — Spitze nach Speicher in GW und netzseitige Ladung in GWh. Markt ×10: gedämpfte Fußnote zur neuen Spitze 96,76 GW (21.10. 14:00, Restlast + Laden + Preis). Darunter der bestehende Monatslauf mit Faktor-/Fahrweisen-Umschalter und Viertelstundenkurve.

**November:** Kein Oktober-Duplikat; Insights verweisen auf Oktober-Lauf.

## Ort `/ort`

**Erster Blick:** Beispielanschluss und Auslastungskurve unverändert. Keine Netzkarte. Hinweis auf öffentliche ÜNB-Veröffentlichungen (TransnetBW, 50Hertz) und die Lücke bis Mittelspannung — nur Links, keine erfundenen MW.

## Methodik `/methodik`

**Erweiterung:** Abschnitt `#insights` mit den neun Regeln: Schwelle, Formel in Klartext, Einheit, Unsicherheit, Gegenrechnung. `#preis-fenster` bleibt. Neue Kennzahlen des Vergleichscharts dokumentiert.

## Beiträge `/beitraege`

**Politur:** Typo-Skala, Abstände, ein Lesegraph (Preiskurve im Index) — konsistent mit der Kette, kein zweiter Datenpfad.

## Gemeinsam

- Markt-Insights: deterministisch, kompakt, max. ~5 Regeln sichtbar pro Seite.
- Lighthouse: a11y 100, Performance mobil ≥ 90, CLS &lt; 0,1, kein Overflow bei 390 px.
- Zahlen nur aus vorhandenen Daten; Kernzahlen der Startseite unverändert.
