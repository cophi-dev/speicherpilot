"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { flushSync } from "react-dom";

import { BrandLockup } from "@/components/BrandLockup";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavigationMain } from "@/components/NavigationMain";
import { NavigationProgress } from "@/components/NavigationProgress";
import { AppLanguage, LanguageContext } from "@/components/language-context";

import type { NavShortcuts } from "@/lib/navShortcuts.server";
import {
  isSiteMainNavActive,
  isSiteMobileExtraNavActive,
  SITE_MAIN_NAV,
  SITE_MOBILE_EXTRA_NAV,
  type SiteMainNavHref,
} from "@/lib/siteNav";

type SiteShellProps = {
  children: React.ReactNode;
  navShortcuts: NavShortcuts;
};

type ThemePreference = "light" | "dark" | "system";

function resolveTheme(pref: ThemePreference): "light" | "dark" {
  if (pref === "system") {
    if (typeof window === "undefined") {
      return "light";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return pref;
}

function readThemePreferenceFromStorage(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }
  const stored =
    window.localStorage.getItem("speicherpilot-theme") ?? window.localStorage.getItem("bessforge-theme");
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

function applyThemePreferenceToDocument(pref: ThemePreference) {
  const root = document.documentElement;
  const resolved = resolveTheme(pref);
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved === "dark" ? "dark" : "light";
  window.localStorage.setItem("speicherpilot-theme", pref);
}

function navItemHref(item: (typeof SITE_MAIN_NAV)[number], navShortcuts: NavShortcuts): string {
  if (item.href === "/tag") {
    return navShortcuts.tagHref;
  }
  if (item.href === "/monat") {
    return navShortcuts.monatHref;
  }
  return item.href;
}

function mainNavLinkClass(active: boolean) {
  return active
    ? "inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-1 font-semibold text-[var(--v4-warm)]"
    : "inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-1 text-muted-foreground hover:text-foreground";
}

function mobileNavLinkClass(active: boolean) {
  return `inline-flex min-h-11 items-center py-2 focus-visible:ring-2 focus-visible:ring-ring ${
    active ? "font-semibold text-[var(--v4-warm)]" : "text-foreground"
  }`;
}

export function SiteShell({ children, navShortcuts }: SiteShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [themePref, setThemePref] = useState<ThemePreference>("system");
  const [mounted, setMounted] = useState(false);
  const language: AppLanguage = "de";
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLgNav, setIsLgNav] = useState(false);
  const [locationHash, setLocationHash] = useState("");
  const nightHero = pathname === "/" || pathname.startsWith("/tag");
  const [overHero, setOverHero] = useState(nightHero);
  const [atTop, setAtTop] = useState(true);
  const [trackedPath, setTrackedPath] = useState(pathname);
  if (pathname !== trackedPath) {
    setTrackedPath(pathname);
    setOverHero(nightHero);
    setAtTop(true);
  }

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setThemePref(readThemePreferenceFromStorage());
      setMounted(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    for (const item of SITE_MAIN_NAV) {
      router.prefetch(navItemHref(item, navShortcuts));
    }
  }, [mounted, router, pathname, navShortcuts]);

  useEffect(() => {
    const syncHash = () => setLocationHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLgNav(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    applyThemePreferenceToDocument(themePref);
  }, [themePref, mounted]);

  useEffect(() => {
    if (themePref !== "system") {
      return undefined;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      const root = document.documentElement;
      const resolved = mq.matches ? "dark" : "light";
      root.classList.toggle("dark", resolved === "dark");
      root.style.colorScheme = resolved;
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [themePref]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }
    const desktopNav = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktopNav.matches) {
        setMenuOpen(false);
      }
    };
    closeOnDesktop();
    desktopNav.addEventListener("change", closeOnDesktop);
    return () => desktopNav.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }
    const query = window.matchMedia("(min-width: 768px)");
    const apply = () => {
      document.querySelectorAll<HTMLDetailsElement>(".site-fold").forEach((node) => {
        node.open = query.matches;
      });
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [pathname]);

  useLayoutEffect(() => {
    const update = () => {
      setAtTop(window.scrollY <= 0);
      const hero = document.querySelector(".v4-kopf, .day-hero");
      if (!hero) {
        if (!nightHero) {
          setOverHero(false);
        }
        return;
      }
      const header = document.querySelector(".site-header");
      const headerBottom = header?.getBoundingClientRect().bottom ?? 64;
      const rect = hero.getBoundingClientRect();
      setOverHero(rect.bottom > headerBottom && rect.top < window.innerHeight);
    };
    update();
    const main = document.getElementById("inhalt");
    const mutations = new MutationObserver(update);
    if (main) {
      mutations.observe(main, { childList: true, subtree: true });
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      mutations.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [nightHero, pathname]);

  const resolvedTheme = mounted ? resolveTheme(themePref) : "light";
  const themeIsDark = resolvedTheme === "dark";

  const handleThemeToggle = useCallback(
    (btn: HTMLButtonElement) => {
      const next: ThemePreference = themeIsDark ? "light" : "dark";
      const goingDark = next === "dark";

      const apply = () => {
        flushSync(() => {
          setThemePref(next);
        });
        applyThemePreferenceToDocument(next);
      };

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const startVT = (
        document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } }
      ).startViewTransition;

      if (reduce || typeof startVT !== "function") {
        apply();
        return;
      }

      const rect = btn.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      const html = document.documentElement;
      html.style.setProperty("--vt-x", `${x}px`);
      html.style.setProperty("--vt-y", `${y}px`);
      html.style.setProperty("--vt-r", `${radius}px`);
      html.classList.toggle("vt-to-dark", goingDark);
      html.classList.toggle("vt-to-light", !goingDark);

      const vt = startVT.call(document, apply);
      void vt.finished.finally(() => {
        html.classList.remove("vt-to-dark", "vt-to-light");
      });
    },
    [themeIsDark],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage: () => {} }}>
      <div className="relative min-h-screen bg-background text-foreground">
        <a
          href="#inhalt"
          className="site-shell-skip fixed -top-32 left-2 z-[80] inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-card px-4 py-2.5 text-sm shadow-[0_0_0_2px_var(--ring)] focus:top-2 focus-visible:top-2"
        >
          Zum Inhalt
        </a>
        <NavigationProgress label="Seite wird geladen." />
        <header
          className={`site-header sticky top-0 z-40 h-16 border-b ${overHero ? `is-over-hero border-transparent ${atTop ? "is-hero-top bg-transparent" : "is-hero-scrolled"}` : "border-[var(--linie)] bg-[var(--bg)] text-foreground"}`}
        >
          <div className="mx-auto flex h-16 w-full max-w-[1360px] items-center justify-between gap-3 px-5 md:px-8">
            <BrandLockup />
            {isLgNav ? (
            <nav
              id="site-desktop-nav"
              className="flex min-h-6 min-w-0 items-center gap-5 text-sm font-medium"
              aria-label="Hauptnavigation"
            >
              {SITE_MAIN_NAV.map((item) => {
                const href = navItemHref(item, navShortcuts);
                const active = isSiteMainNavActive(pathname, item.href as SiteMainNavHref);
                return (
                  <Link
                    key={item.href}
                    href={href}
                    prefetch
                    className={mainNavLinkClass(active)}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            ) : null}
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle isDark={themeIsDark} mounted={mounted} onToggle={handleThemeToggle} />
              <button
                type="button"
                className="inline-flex h-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
                aria-expanded={menuOpen}
                aria-controls="site-mobile-nav"
                aria-label="Menü"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <X className="size-4" strokeWidth={1.5} /> : <Menu className="size-4" strokeWidth={1.5} />}
              </button>
            </div>
          </div>
          {menuOpen ? (
            <div className="border-t border-border bg-card px-5 py-4 md:px-8 lg:hidden">
              <nav id="site-mobile-nav" className="flex flex-col gap-1 text-sm font-medium" aria-label="Hauptnavigation">
                {SITE_MAIN_NAV.map((item) => {
                  const href = navItemHref(item, navShortcuts);
                  const active = isSiteMainNavActive(pathname, item.href as SiteMainNavHref);
                  return (
                    <Link
                      key={item.href}
                      href={href}
                      prefetch
                      className={mobileNavLinkClass(active)}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                {SITE_MOBILE_EXTRA_NAV.map((item) => {
                  const active = isSiteMobileExtraNavActive(pathname, item.href, locationHash);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch
                      className={mobileNavLinkClass(active)}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ) : null}
        </header>
        <main id="inhalt">
          <NavigationMain>{children}</NavigationMain>
        </main>
        <footer className="border-t border-border">
          <div className="mx-auto max-w-[1200px] px-5 py-8 text-sm text-muted-foreground md:px-8">
            <nav className="legal-footer" aria-label="Rechtliches und Methodik">
              <Link href="/impressum">Impressum</Link>
              <Link href="/datenschutz">Datenschutz</Link>
              <Link href="/methodik">Methodik</Link>
            </nav>
            <p className="mt-6 max-w-[52rem] leading-relaxed">
              Quellen und Glossar stehen in der{" "}
              <Link href="/methodik#quellen" className="text-primary underline underline-offset-[3px]">
                Methodik
              </Link>
              . Modellrechnungen dienen der Einordnung, nicht der Beschaffung oder Anlagenplanung. Wo Euro stehen, ist
              das als Modellschätzung gekennzeichnet.
            </p>
          </div>
        </footer>
      </div>
    </LanguageContext.Provider>
  );
}
