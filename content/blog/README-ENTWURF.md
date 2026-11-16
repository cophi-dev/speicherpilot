# Monatsbeitrag aus Entwurf veröffentlichen

1. Inhalt in `entwurf-november-resume-2026.md` fertigstellen (KPIs, Quellenblock, Stand-Zeile).
2. In `content/blog/posts.ts` den Eintrag `november-resume-2026` anpassen:
   - `draft: true` entfernen (oder auf `false` setzen).
   - `published` / `publishedLabel` auf das Veröffentlichungsdatum setzen.
   - Optional `inserts` für Figures ergänzen (wie bei den beiden Live-Artikeln).
3. `pnpm test -- content/blog/posts.test.ts` und Lint ausführen.
4. Artikel-Route: `/beitraege/november-resume-2026` (erscheint erst ohne `draft`).

Entwürfe mit `draft: true` werden von `getBlogPosts()` ausgeschlossen und erscheinen nicht in `/beitraege`.