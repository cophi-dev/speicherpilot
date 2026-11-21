/** Shared main-site navigation targets (header + mobile drawer). */
export const SITE_MAIN_NAV = [
  { href: "/tag", label: "Tag" },
  { href: "/monat", label: "Monat" },
  { href: "/jahr", label: "Jahr" },
  { href: "/kompromiss", label: "Simulator" },
  { href: "/knoten", label: "Knoten" },
  { href: "/beitraege", label: "Beiträge" },
  { href: "/methodik", label: "Methodik" },
] as const;

/** Extra mobile-only jump links (no desktop nav duplicate). */
export const SITE_MOBILE_EXTRA_NAV: readonly {
  readonly href: string;
  readonly label: string;
  readonly fragment: string;
}[] = [] as const;

export type SiteMainNavHref = (typeof SITE_MAIN_NAV)[number]["href"];

export function isSiteMainNavActive(pathname: string, itemHref: SiteMainNavHref): boolean {
  if (itemHref === "/tag") {
    return pathname === "/" || pathname.startsWith("/tag");
  }
  if (itemHref === "/monat") {
    return pathname.startsWith("/monat");
  }
  if (itemHref === "/jahr") {
    return pathname.startsWith("/jahr");
  }
  if (itemHref === "/kompromiss") {
    return pathname.startsWith("/kompromiss") || pathname.startsWith("/simulator");
  }
  if (itemHref === "/knoten") {
    return pathname.startsWith("/knoten");
  }
  return pathname.startsWith(itemHref);
}

export function isSiteMobileExtraNavActive(pathname: string, href: string, hash: string): boolean {
  if (href !== "/#woche") {
    return false;
  }
  return pathname === "/" && hash === "#woche";
}

/** Static path segments under `app/` that main nav may resolve to (before dynamic shortcuts). */
export const SITE_MAIN_NAV_STATIC_ROUTES: readonly string[] = [
  "/",
  "/tag",
  "/monat",
  "/jahr",
  "/kompromiss",
  "/knoten",
  "/methodik",
  "/beitraege",
  "/impressum",
  "/datenschutz",
];