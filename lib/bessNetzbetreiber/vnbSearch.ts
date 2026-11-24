/** Such-Aliase → VNB-Bucket-Key (MaStR / Bundle). */
const QUERY_TO_BUCKET_KEY: Record<string, string> = {
  mitnetz: "mitnetz_envia",
  enviam: "mitnetz_envia",
  "envia m": "mitnetz_envia",
  mitteldeutsche: "mitnetz_envia",
  "mitteldeutsche netzgesellschaft": "mitnetz_envia",
  westnetz: "eon_westnetz",
  bayernwerk: "eon_bayernwerk",
  avacon: "eon_avacon",
  "sh netz": "eon_sh_netz",
  "schleswig-holstein netz": "eon_sh_netz",
  "e.dis": "eon_edis",
  lew: "eon_lew",
  syna: "eon_syna",
  regionetz: "eon_regionetz",
  energis: "eon_energis",
  "ewe netz": "ewe_netz",
};

export function resolveVnbSearchFocusKey(query: string): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  if (QUERY_TO_BUCKET_KEY[q]) return QUERY_TO_BUCKET_KEY[q];
  for (const [alias, key] of Object.entries(QUERY_TO_BUCKET_KEY)) {
    if (q.includes(alias) || alias.includes(q)) return key;
  }
  return null;
}