"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useLayoutEffect, useState } from "react";

import { BrandLockup } from "@/components/BrandLockup";
import { NavigationProgress } from "@/components/NavigationProgress";
import { AppLanguage, LanguageContext } from "@/components/language-context";

type SiteShellProps = {
  children: React.ReactNode;
};

type ThemePreference = "light" | "dark" | "system";

const NAV = [
  { href: "/", label: "Start" },
  { href: "/tag", label: "Tag" },
  { href: "/ort", label: "Ort" },
  { href: "/methodik", label: "Methodik" },
  { href: "/beitraege", label: "Beiträge" },
] as const;

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

export function SiteShell({ children }: SiteShellProps) {
  const pathname = usePathname();
  const [themePref, setThemePref] = useState<ThemePreference>("system");
  const [mounted, setMounted] = useState(false);
  const language: AppLanguage = "de";
  const [menuOpen, setMenuOpen] = useState(false);
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
    const root = document.documentElement;
    const resolved = resolveTheme(themePref);
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved === "dark" ? "dark" : "light";
    window.localStorage.setItem("speicherpilot-theme", themePref);
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

  return (
    <LanguageContext.Provider value={{ language, setLanguage: () => {} }}>
      <div className="relative min-h-screen bg-background text-foreground">
        <a href="#inhalt" className="site-shell-skip sr-only focus:not-sr-only">
          Zum Inhalt
        </a>
        <NavigationProgress label="Seite wird geladen." />
        <header
          className={`site-header sticky top-0 z-40 h-16 border-b ${overHero ? `is-over-hero border-transparent ${atTop ? "is-hero-top bg-transparent" : "is-hero-scrolled"}` : "border-[var(--linie)] bg-[var(--bg)] text-foreground"}`}
        >
          <div className="mx-auto flex h-16 w-full max-w-[1360px] items-center justify-between gap-3 px-5 md:px-8">
            <BrandLockup />
            <nav className="hidden min-h-6 min-w-0 items-center gap-7 text-sm font-medium lg:flex" aria-label="Hauptnavigation">
              {NAV.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : item.href === "/tag"
                      ? pathname.startsWith("/tag")
                      : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-1 ${active ? "font-semibold text-[var(--v4-warm)]" : "text-muted-foreground hover:text-foreground"}`}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-current focus-visible:ring-2 focus-visible:ring-ring"
                aria-pressed={mounted ? resolvedTheme === "dark" : undefined}
                aria-label="Darstellung"
                onClick={() => setThemePref(resolvedTheme === "dark" ? "light" : "dark")}
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="size-5" strokeWidth={1.5} aria-hidden />
                ) : (
                  <Moon className="size-5" strokeWidth={1.5} aria-hidden />
                )}
              </button>
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
              <nav id="site-mobile-nav" className="flex flex-col gap-3 text-sm font-medium" aria-label="Hauptnavigation">
                {NAV.map((item) => (
                  <Link key={item.href} href={item.href} prefetch={false} onClick={() => setMenuOpen(false)}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          ) : null}
        </header>
        <main id="inhalt">{children}</main>
        <footer className="border-t border-border">
          <div className="mx-auto max-w-[1200px] px-5 pt-4 md:px-8">
            <nav className="legal-footer" aria-label="Rechtliches">
              <Link href="/impressum">Impressum</Link>
              <Link href="/datenschutz">Datenschutz</Link>
            </nav>
          </div>
          <div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-8 text-sm text-muted-foreground md:grid-cols-3 md:px-8 site-footer-cols">
            <div className="site-footer-col">
              <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">Quellen</p>
              <ul className="mt-3 space-y-1.5">
                <li>
                  <a className="text-primary underline underline-offset-[3px]" href="https://energy-charts.info/" target="_blank" rel="noreferrer">
                    Energy-Charts (Fraunhofer ISE), CC BY 4.0
                  </a>
                </li>
                <li>
                  <a className="text-primary underline underline-offset-[3px]" href="https://battery-charts.info/" target="_blank" rel="noreferrer">
                    Battery Charts (RWTH Aachen), CC BY 4.0
                  </a>
                </li>
                <li>
                  <a className="text-primary underline underline-offset-[3px]" href="https://www.smard.de/" target="_blank" rel="noreferrer">
                    Bundesnetzagentur | SMARD.de
                  </a>
                </li>
                <li>
                  <a className="text-primary underline underline-offset-[3px]" href="https://www.marktstammdatenregister.de/" target="_blank" rel="noreferrer">
                    MaStR
                  </a>
                </li>
              </ul>
              <p className="num mt-6 text-[12px] tracking-[0.08em] text-muted-foreground uppercase">Glossar</p>
              <p className="mt-3">
                <Link href="/methodik#glossar">Begriffe in der Methodik</Link>
              </p>
            </div>
            <p className="flex flex-col items-start gap-1">
              <Link className="inline-flex min-h-11 items-center" href="/methodik">
                Methodik
              </Link>
              <Link className="inline-flex min-h-11 items-center" href="/beitraege" prefetch={false}>
                Beiträge
              </Link>
            </p>
            <p>
              Modellrechnungen dienen der Einordnung, nicht der Beschaffung oder Anlagenplanung. Wo Euro stehen, ist das als Modellschätzung gekennzeichnet.
            </p>
          </div>
        </footer>
      </div>
    </LanguageContext.Provider>
  );
}
