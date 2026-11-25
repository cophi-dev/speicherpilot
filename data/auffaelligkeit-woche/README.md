# Auffälligkeit der Woche · Tagesdateien

Schema `auffaelligkeit-woche/1`. Eine Datei je Tag: `tage/JJJJ-MM-TT.json`.

Quelle: Rechnung von speicherpilot (`forschung/auffaelligkeit_woche_v1`, Stand 25.11.2026).
Das sind die verbindlichen Day-Ahead-Erlöse und der Spitzen-Fahrplan
(min. Tagesspitze, danach max. Erlös) für die Referenzflotte
(4,64 GW / 8,15 GWh Nennenergie, nutzbar 6,52 GWh bei SoC 10–90 %).
Im Repo entspricht das der Stufe ×2.

Nicht von Hand ändern und keine Euro selbst nachrechnen.

17.11.2026 fehlte in der ersten Lieferung (Nachtlauf ohne Tagesläufe) und
wurde am 25.11.2026 mit demselben Skript `src/rechne_woche.py` nachgeholt.
