/** Fußnote unter dem Artikelkörper (vor der Quellenliste), z. B. Netz-Updates. */
export type ArticleFootnote = {
  /** Anzeige nach „Stand:“, z. B. 16.11.2026 */
  stand: string;
  /** Standard: „Quellen in eckigen Klammern“ */
  citeHint?: string;
  /** z. B. „Gemeint sind Batterie-Großspeicher.“ */
  scope?: string;
};

const DEFAULT_CITE_HINT = "Quellen in eckigen Klammern";

export function formatArticleFootnote(note: ArticleFootnote): string {
  const cite = note.citeHint?.trim() || DEFAULT_CITE_HINT;
  const parts = [`Stand: ${note.stand}.`, `${cite}.`];
  const scope = note.scope?.trim();
  if (scope) {
    parts.push(scope.endsWith(".") ? scope : `${scope}.`);
  }
  return parts.join(" ");
}