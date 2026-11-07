# Run18 — Mobile Leseführung (ohne Inhaltsstreichen)

## Ziel
Roter Faden auf dem Handy: **Kernaussage → Grafik → kurze Erklärung → Details** (offen klappbar). Desktop unverändert in der Gewichtung.

## Änderungen

| Ort | Vorher (Mobil) | Nachher (Mobil) |
|-----|----------------|-----------------|
| **Tag · 01** | Kernaussage, sofort Definition + letzter Überschusstag, dann Chart, darunter drei gleich große Schritte | Kernaussage → **Lücke-Chart** → optional „Klarstellung zur Kennzahl“ → Schritte unter **„Tag in drei Phasen“** (zu) |
| **Tag · Modellflotte** | Lange Subline vor Steuerung; **7 KPI-Kacheln** vor Chart | Subline in **„Kontext Monatslauf“** (zu); **3 Kern-KPIs** sichtbar, Rest unter **„Weitere Kennzahlen“**; dann Chart (unverändert) |
| **KPI-Breite Desktop** | `margin: 0 0 24px` auf KPI-Grid hob `margin-inline: auto` auf; Beleg-Box hatte eigenes `max-width: 72rem` | KPI-Spalte = `v4-content` (1240px), gemeinsame Zentrierung |

Alle Fachwerte und Tabellen bleiben erreichbar (Tastatur: `summary`/`details`, Viertelstunden-Tabelle wie bisher).

## Nicht geändert
Rechenlogik, Bundle, Solver, Desktop-Layout der Monatsseite (nur gleiches KPI-Muster bei Bedarf später), keine Share/OG-Features.
