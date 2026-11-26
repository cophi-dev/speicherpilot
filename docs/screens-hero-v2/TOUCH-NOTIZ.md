# Touch- & Drag-Notiz (`/netzbetreiber` 3D)

- **Gemeinsame Steuerungsstelle:** `lib/bessKarte3d/projection3d.ts` (`VERTICAL_TILT_SIGN = -1`, `orbitCameraBy`, `applyVerticalTiltDelta`) und `components/bess-netzbetreiber/BessKarteCanvas3d.tsx`.
- **Desktop-Drag-Prüfung (Playwright 1280×900):** Start `3D`-Button `aria-pressed=false` → nach oben ziehen (`dy = -120 px`) → `aria-pressed=true` (stärker in 3D geneigt) → nach unten ziehen (`dy = +140 px`) → `aria-pressed=false` (Ansicht folgt dem Zeiger nach unten Richtung Draufsicht).
- **Touch/Mobil (390×844, `touchFriendly`):** Hinweis sichtbar (`Ein Finger: Seite scrollen · Zwei Finger: drehen und zoomen · Antippen: Details`). Ein Finger bleibt `pan-y` (Seite scrollt). Zwei-Finger-Ziehen ruft dieselbe Funktion `orbitCameraBy(next, midX - prev.midX, midY - prev.midY)` auf (Unit-Test in `BessKarteCanvas3d.test.tsx` grün); echtes iOS-Gerät vor Merge kurz manuell gegenprüfen.
- **Startseiten-Karte (`StartKarteCanvas3d`):** Reine Vorschau ohne Zeiger-/Touch-Handler; teilt die Drag-Steuerung nicht.
