# SpeicherPilot — Produkt- & UX-Audit (Phase 1)

**Stand:** 3.11.2026 · **Quellen:** Live https://www.speicherpilot.app (Screenshots in `docs/audit-screenshots/`), Repo-Stand Branch `cursor/audit-opus-phase1-5a69`, Beilage `naechstes_paket.md`, `posts/STATUS`-Stil via Upload.

---

## (a) Fazit in fünf Zeilen

1. Der fachliche Kern (Übersicht Heute/Gestern/7/30 Tage, ×1–×10, Import/Überschuss/Abregelung-Kontext) sitzt gut auf **`/`** — das ist der richtige Morgen-Anker für Phillipp.
2. **`/live`** liefert den Tagesfilm (Ring, MixChart, Monatsüberblick), überlappt aber in Regler-Logik und Erzählung mit der Startseite; ohne klare Trennung wirkt die App länger als nötig.
3. **`/site`** trennt Projektierer und Netzbetreiber sinnvoll, stapelt auf der Netz-Sicht aber Simulator, Grenze/Erlös-Rechner und Testnetz — schwer scanbar, Testnetz weiterhin schwach in SSR/Deep-Link (siehe Beilage).
4. **Content-Pipeline fehlt als Produkt:** Blog (`/blog`) und News (`/news`) hängen im Footer; es gibt keinen täglichen „Erkenntnis → Kopiertext“-Pfad wie in `posts/STATUS.md` beschrieben.
5. Design v2 ist ruhig und vertrauenswürdig; für „Award-Anspruch + tägliche Arbeit“ braucht es schlankere IA, weniger Doppelungen, Chart-Lesbarkeit, Mobile-Polish und **Accessibility 100** (Live-Check Startseite: 96/100 wegen Kontrast).

---

## 1. Use Cases (2–4 Nutzer)

| Nutzer | Aufgabe | Primäre Route | Passt? | Überflüssig / doppelt |
|--------|---------|---------------|--------|------------------------|
| **Phillipp (Owner, morgens)** | Gestern/7 Tage: Überschuss, Import, Abregelung; 1–3 postbare Sätze; ggf. Deep-Link auf starken Tag | **`/`** (`blick`, `x`), dann **`/live?tag=…`** für Einzelttag | Kern auf `/` stark; postbarer Text nur implizit in `einschaetzung`-Absatz | **`/news`** = externe Presse, nicht „eigene Erkenntnis“; kein `/beitraege`; Blog versteckt |
| **Phillipp (Content)** | Kurzpost oder Blog wie Upload-Entwurf; Zahlen geprüft; Kopieren, selbst auf LinkedIn | **`/blog/[slug]`** (1 Artikel), **`posts/`** im Repo (nicht im Nav) | Stil Blog passt; Workflow nicht in UI | Blog vs. News vs. posts — drei Welten |
| **Projektierer** | Lohnt Speicher am Standort? Größe, Peak, grobe Wirtschaftlichkeit | **`/site?view=projekt`** (+ Szenario Supermarkt/Quartier/Bollingstedt) | Klare Tür von `/` „Ich plane einen Speicher“ | Alte **`/szenarien`**-URL nur Redirect; Konfigurator-Reste in Codebase nicht in Hauptnav |
| **Netzbetreiber** | Belastet Speicher **einen** Anschluss? Badge netzdienlich/neutral/belastend; Grenze vs. Erlös | **`/site?view=netz`**, Hash **`#testnetz-n1`**, **`/netz`** → Redirect | Badge + Ampel am Beispiel gut; Testnetz sichtbar im Screenshot, aber SSR/Hash laut Beilage fehleranfällig | **Grenze und Erlös** in `<details closed>` — Kern für NB oft versteckt; nationale Flotte auf `/` nicht NB-Perspektive (richtig so, aber Navigation muss das sagen) |

**Fehlender Use Case in der UI:** „Heute 3 Erkenntnisse“ als Liste (Rekord-Überschuss, Abendspitze, Speichertag ×10 saturates) — Daten sind da, Produktfläche fehlt.

---

## 2. Roter Faden & Informationsarchitektur

### Ist (Navigation + Inseln)

- **Header (4):** Start · Tag · Standort · Methodik  
- **Footer:** Blog · News · Glossar → Methodik · Impressum/Datenschutz · Theme 2×  
- **Redirects:** `/netz` → `/site?view=netz#testnetz-n1`, `/szenarien` → `/site?view=netz#grenze-erloes`

### Problem

- Zwei Einstiege für **Deutschland-Zeitraum** (`/` Übersicht vs. `/live` Tag) ohne erklärte Rollen.
- **Beiträge** (eigene Posts + Blog) nicht in der Hauptstory.
- **Methodik** sehr lang (Screenshot ~4,5 MB Full-Page) — gut als Referenz, schlecht als lineares Lesen.
- **News** konkurriert mit eigenem Content, ist aber nur Kuratierung extern.

### Vorschlag: wenige Hauptseiten

| Seite | Rolle | Inhalt |
|-------|--------|--------|
| **`/` — Übersicht** | Morgen-Dashboard | Blick Heute/Gestern/7/30, Trio KPI, Balken ×1–×10, 1–3 **Erkenntnis-Karten** (neu), Türen Projekt/Netz |
| **`/live` — Ein Tag** | Zoom | Ring, Regler, Erzeugung/Last, Link zurück zur Übersicht |
| **`/site` — Standort** | Zwei Perspektiven | Projekt / Netz (Segment), **ein** Simulator pro Anschlusspunkt, NB: Badge + Testnetz **ohne** Klappe als Standard |
| **`/beitraege`** (neu) | Content-Hub | Tabs: **Kurz** (posts/*.md), **Artikel** (content/blog), optional **News** als „Extern geprüft“ |
| **`/methodik`** | Transparenz | In **A–D** gegliedert (siehe Beilage), Anker statt Endlos-Scroll |

**Hinter Klappen / sekundär:** Detail-Tabellen auf `/`, Monatsblock auf `/live`, Grenze/Erlös-Rechner nur NB-Sicht oben fold-in, Footer-Glossar-Kurzliste.

**Streichen / zusammenlegen (IA, nicht sofort Code):** Doppelte Theme-Schalter im Footer; News aus Footer-Hauptlink in `/beitraege`; `/blog` canonical → `/beitraege/artikel/…` (Redirect).

---

## 3. Erkenntnis- & Content-Workflow (Vorschlag)

### Täglich 1–3 Erkenntnisse (automatisch)

Regelbasiert aus vorhandenen Modellen (`overviewSentence`, `OverviewsBundle`, `dayOverview`), z. B.:

- Stärkster **Überschuss-Tag** im gewählten Blick  
- **Abendspitze** before/after ×1  
- Tag mit **×10 saturates** (Speicher voll, Rest-Überschuss hoch)  
- **Import/Rekord-Handel** im Zeitraum  

Darstellung auf `/`: kompakte Karten mit **„Text kopieren“** (LinkedIn-DE, 400–800 Zeichen, Zahlen + „Modellschätzung“ wo nötig, Link `speicherpilot.app/?blick=…` optional im Fließtext — **kein Share-Button, kein OG-Bild**).

### Beiträge-Bereich `/beitraege`

- **Kurzposts:** statische Markdown-Dateien unter `posts/` (Frontmatter: Datum, Status, `linkedin-de.txt`-Block oder ein Feld `copyText`).  
- **Artikel:** bestehendes `content/blog/*.md` + Figuren — wie Upload-Stil (Quellen am Ende, „Was vereinfacht“-Kasten).  
- **Redaktion:** Phillipp postet LinkedIn selbst; UI liefert nur Copy + Vorschau.  
- **Pipeline:** optional später „Aus Erkenntnis → Entwurf in posts/` speichern“ (Phase 2+, git commit).

Referenzstil: Upload `blog1_grossspeicher_netz.md`, `STATUS.md` (geprüft, geparkt, Serie Netzbetreiber).

---

## 4. Design (Redesign v2)

**Stärken (Screenshots Desktop 1440 / Mobile 375):**

- Startseite: klare H1-Frage, Period-Segment, Trio-Karten, Modell-Chip, Perspektiven-Türen.  
- `/live`: Live-Strip, Ring, Modell-Kicker — „ruhig, wenig Werbeprosa“.  
- Blog-Karte mit Figuren — qualitativ hoch, passt zu LinkedIn-Hochformat-Plan in STATUS.

**Schwächen / Award-Lücke:**

| Thema | Befund |
|-------|--------|
| Chart-Lesbarkeit | Balken „aufgenommen vs. Rest“ ohne direkte Legende am Chart (Beilage Phillipp); MixChart Überschussfläche vs. Stapel (Beilage PR 59) |
| `/site?view=netz` | Lange Scroll-Strecke; zweite Farbwelt Testnetz vs. day-paper (Beilage) |
| Mobile | Tap-Ziele Header OK (44px Theme); Beilage: **3 px Overflow** `/site`, Methodik sehr lang, Tagseite `/live` extrem lang |
| Hierarchie | `/live` mischt „kein Überschuss“-Story, Ring, großes MixChart, Monatsstatistik — drei Artikel in einer URL |
| Kontrast | Lighthouse: `color-contrast` fail auf `/` → Ziel a11y **100** blockiert |
| Vertrauen | „Wir zeigen den letzten erfolgreichen Abruf“-Banner (Beilage stale-Logik) kann bei frischen Daten kurz irritieren |

Design-System: Tokens/Komponenten in Repo (`globals.css`, `site-v2`, `uebersicht`, `day-hero`) — Umbau in v2 fortsetzen, keine Parallelwelt.

---

## 5. Funktion & Qualität

Aus Beilage **naechstes_paket.md** + Live-Check:

| Prio | Thema |
|------|--------|
| Hoch | Stale-Banner vs. frischer Datenstand |
| Hoch | Testnetz: SSR (view serverseitig), `#testnetz-n1` scroll/open |
| Hoch | MixChart Überschuss-Geometrie + Legende |
| Mittel | `overviewSentence` Rundungsband („15 %“ vs. „ein Zehntel“) |
| Mittel | Doppelklammern, „an diesem Tag“ bei Blick Tag |
| Mittel | Fleet-Snapshot 4,52/7,86 vs. Battery-Charts — auf Methodik benennen |
| Mittel | Methodik: §17/§14a EnWG Deep-Links |
| Niedrig | CLS Slider min-height, Restsprung 23–32 px |

**SSR:** `SiteOperatorSections` ist Client; Testnetz-Inhalt fehlt im initialen HTML (Crawler, langsame First Paint). **`/site` Default-View:** ohne `?view=` — laut Product Intent kein stilles Umschalten; prüfen ob SSR-Default = projekt.

**Performance:** Lighthouse Start ~97 — gut; Methodik Full-Page screenshot 4,5 MB spricht für **kürzere Kapitel + Anker**, nicht für schwerere Assets.

**Regeln eingehalten (Stichprobe Live/Code):** Kein Tesla; keine verbotenen „Anschlussprüfung“-Formulierungen in Tests/Copy; Euro nur ×1 mit Modellschätzung; keine Share-Buttons.

---

## 6. Verständlichkeit (Laien & Netzbetreiber)

**Gut:** Alltagssprache auf `/` und `/live`; GlossaryTip + `/methodik#glossar`; Badge „netzdienlich“ mit Schätz-Hinweis.

**Nachschärfen:**

- **Residuallast / Überschuss / Handel** im Trio — für Laien kurze Einzeiler unter der Überschrift (Tooltip reicht nicht überall).  
- **Modellschätzung** vs. **Messung** bei Bollingstedt MODELLTAG — im Hero wiederholen.  
- **Netzbetreiber:** „Speichern von Überschuss ist nicht automatisch netzdienlich“ — auf `/site?view=netz` above the fold, nicht nur Methodik.  
- **Abregelung** im Kontextsatz — gut; Bezug SMARD Quartal behalten.  
- EN-Sprachumschalter: für Zielgruppe DE-first ok; EN-Parität bei neuen Strings nicht vergessen.

---

## (b) Top-10-Befunde (Schwere · Aufwand)

| # | Befund | Schwere | Aufwand |
|---|--------|---------|---------|
| 1 | Kein Content-Workflow (Erkenntnis → Kopierpost → Blog) | hoch | mittel |
| 2 | `/` vs. `/live` Doppelung ohne klare Story | hoch | mittel |
| 3 | MixChart / Überschuss-Lesbarkeit | hoch | mittel |
| 4 | Testnetz SSR + Deep-Link | hoch | klein–mittel |
| 5 | `/site` Netz-Sicht zu lang, Grenze/Erlös versteckt | mittel | mittel |
| 6 | Methodik unstrukturiert lang (A–D fehlt) | mittel | mittel |
| 7 | a11y Kontrast ≠ 100 | mittel | klein |
| 8 | Stale-Banner-Logik | mittel | klein |
| 9 | Mobile Overflow / lange Scrolls | mittel | klein–mittel |
| 10 | Blog/News/posts drei Silos | mittel | mittel |

---

## (c) Ziel-Informationsarchitektur (Kurz)

```
Start (/)          → Zeitraum-Übersicht + Erkenntnisse + Türen
Tag (/live)        → Ein Tag Deutschland
Standort (/site)   → ?view=projekt | netz (+ Szenario)
Beiträge (/beitraege) → Kurz + Artikel [+ News extern]
Methodik           → A Modell · B Daten · C Beispiele · D Recht/Glossar
```

Redirects beibehalten: `/netz`, `/szenarien`, später `/blog` → Beiträge.

---

## (d) Umbauplan in drei Paketen

### Paket 1 — Roter Faden & Content (Abnahme zuerst)

- IA-Texte in Nav: Start / Tag / Standort / **Beiträge** / Methodik  
- `/beitraege` mit MD/MDX aus Repo, **Kopieren**-Button, Blog migriert  
- `/`: 1–3 Erkenntnis-Karten aus Regeln, Link zu `/live?tag=`  
- Klare Intro-Zeile auf `/live`: „Einzelner Tag — Übersicht unter Start“  
- **Abnahme:** Phillipp findet morgens in <2 Min. einen Kopierpost; Blog erreichbar aus Header; keine Share-Buttons; DE-only Copy; Lighthouse a11y ≥ 98 auf `/`.

### Paket 2 — Charts, Netz-Sicht, Qualität

- MixChart + Übersicht-Balken-Legende („Speicher voll“, aufgenommen/Rest)  
- `overviewSentence`-Feinheiten; stale-Banner  
- `/site?view=netz`: Grenze/Erlös sichtbar; Testnetz SSR; Hash `#testnetz-n1`  
- Mobile Overflow, Tap/CLS Fixes  
- Methodik §17/§14a Links; Fleet-Quellenzeile  
- **Abnahme:** Beilage-Punkte erledigt; Testnetz im View-Source; NB findet Testnetz ohne Suche; Charts von Phillipp „lesbar ohne Erklärung“.

### Paket 3 — Feinschliff & Serie

- Methodik A–D; Kapitel fold  
- News unter Beiträge oder dual-link  
- Optional: Serie Netzbetreiber aus STATUS als geplante Kurzposts in UI  
- a11y **100** alle Haupt-Routen  
- **Abnahme:** Lighthouse a11y 100 auf `/`, `/live`, `/site`, `/methodik`, `/beitraege`; Methodik in <5 Klicks zu Round-Trip 85 %.

---

## (e) Bewusst streichen / nicht ausbauen

- Share-Buttons, OG/X-Karten, Auto-LinkedIn-API  
- CMS, kostenpflichtige Dienste  
- Lineare Euro-Skalierung ×2/×5/×10  
- Tesla-/HNE-Branding, verbotene Anschluss-Prüf-Wortwahl  
- Zweite nationale Simulation auf `/site` (Flotte bleibt auf `/` + `/live`)  
- Intraday/Regelmarkt im Kernmodell (nur Day-Ahead, Price Taker, lädt nur aus Überschuss — beibehalten)  
- Footer-Doppel-Theme (ein Ort reicht)

---

## Screenshots (Live, 3.11.2026)

| Route | Desktop | Mobil |
|-------|---------|-------|
| `/` | `home-desktop-1440.png` | `home-mobile-375.png` |
| `/live` | `live-desktop-1440.png` | `live-mobile-375.png` |
| `/site?view=projekt` | `site-projekt-desktop-1440.png` | `site-projekt-mobile-375.png` |
| `/site?view=netz` | `site-netz-desktop-1440.png` | `site-netz-mobile-375.png` |
| `/methodik` | `methodik-desktop-1440.png` | `methodik-mobile-375.png` |
| `/blog` | `blog-desktop-1440.png` | `blog-mobile-375.png` |
| `/news` | `news-desktop-1440.png` | `news-mobile-375.png` |

---

*Phase 1: nur Dokumentation. Produktivcode unverändert bis explizite Freigabe Phase 2.*
