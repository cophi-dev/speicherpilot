/** Shared main-site navigation targets (header + mobile drawer). */
export const SITE_MAIN_NAV = [
  { href: "/", label: "Gestern" },
  { href: "/vision", label: "Vision" },
  { href: "/tag", label: "Tag" },
  { href: "/monat", label: "Monat" },
  { href: "/ort", label: "Ort" },
  { href: "/methodik", label: "Methodik" },
  { href: "/beitraege", label: "Beiträge" },
] as const;

/** Extra mobile-only jump links (no desktop nav duplicate). */
export const SITE_MOBILE_EXTRA_NAV = [{ href: "/#woche", label: "Woche", fragment: "woche" }] as const;

export type SiteMainNavHref = (typeof SITE_MAIN_NAV)[number]["href"];

export function isSiteMainNavActive(pathname: string, itemHref: SiteMainNavHref): boolean {
  if (itemHref === "/") {
    return pathname === "/";
  }
  if (itemHref === "/tag") {
    return pathname.startsWith("/tag");
  }
  if (itemHref === "/monat") {
    return pathname.startsWith("/monat");
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
  "/vision",
  "/tag",
  "/monat",
  "/ort",
  "/methodik",
  "/beitraege",
  "/impressum",
  "/datenschutz",
];
