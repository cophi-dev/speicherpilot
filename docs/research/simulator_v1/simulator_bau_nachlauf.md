# Simulator-Bau: Punkte für den EINEN Cloud-Lauf (gesammelt)
GO Phillipp 12.11 10:36 (via speicherpilot). Design-Vorentwurf: design_simulator_v1/ (SPEZIFIKATION.md).
## speicherpilot-Entscheide 11:1x (Rechenreste aus #101)
1) MIP-Läufe mit 8 152,4588 MWh neu rechnen (Ladungen, Erlöse, Spitze/Überschuss) -> Bundle.
2) rohe ×10-Markt-Zeitreihe auf exakte Flotte (9×4 644,09022 MW), Dauerlinien-Tests anpassen; keine zweite Wahrheit im Bundle.
3) Kipppunkt ≈×3,9: analytisch 64 428 MW verwenden ODER Differenz auf /methodik in einer Zeile erklären.
4) Tages-Snapshots auf /methodik bleiben.
## Offene Fragen design -> speicherpilot (11:15)
(1) Position Werkbank relativ zu Flottenkurven #99; (2) Default ε-70 oder λ-Knie; (3) Preisrückwirkung + Kipppunkt ×3,9 zusammen; (4) 'netzdienlich' = Monatsspitze, nicht jeder Tag (Copy).
## speicherpilot-Entscheide 11:16 (Inhalt, verbindlich)
1) Werkbank = eigener Abschnitt direkt unter Graph 1, vor Graph 3/4; Hero bleibt.
2) Default ε-70 (70 % Spitzensenkung kosten 0,36 % Erlös: 33,97 statt 34,09 Mio €, Modellschätzung); λ-Knie nur auf der Front markieren.
3) Simulator fest ×2, ohne Preisrückwirkung, Label am Simulator; Kipppunkt ≈×3,9 nur Hinweiszeile mit Anker-Link auf Graph 1, kein Regler; Herleitung 64 428 MW auf /methodik.
4) Pflicht-Copy: „netzdienlich = senkt die Monatsspitze, nicht jeden Tag“; wo passend: „Auf Tagesbasis gab es im Oktober keinen Tag, an dem beide Ziele gleichzeitig optimal waren.“
Preview an Phillipp, kein Merge; Euro nur als Modellschätzung.
