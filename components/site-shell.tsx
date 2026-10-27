"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Monitor, Moon, Sun, X } from "lucide-react";

import BessAiChatOverlay from "@/components/BessAiChatOverlay";
import { BrandLockup } from "@/components/BrandLockup";
import { AppLanguage, LanguageContext } from "@/components/language-context";
type SiteShellProps = {
  children: React.ReactNode;
  /** Server-evaluated. The chat client cannot see the API key. */
  chatConfigured?: boolean;
};

type ThemePreference = "light" | "dark" | "system";

const NAV = [
  { href: "/", de: "Start", en: "Start" },
  { href: "/site", de: "Standort", en: "Site" },
  { href: "/live", de: "Live", en: "Live" },
  { href: "/methodik", de: "Methodik", en: "Method" },
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

function readLanguageFromStorage(): AppLanguage {
  if (typeof window === "undefined") {
    return "de";
  }
  const fromQuery = new URLSearchParams(window.location.search).get("lang");
  if (fromQuery === "en" || fromQuery === "de") {
    return fromQuery;
  }
  const stored =
    window.localStorage.getItem("speicherpilot-language") ?? window.localStorage.getItem("bessforge-language");
  if (stored === "en" || stored === "de") {
    return stored;
  }
  return "de";
}

function themeLabel(pref: ThemePreference, language: AppLanguage) {
  if (pref === "system") {
    return language === "de" ? "System" : "System";
  }
  if (pref === "dark") {
    return language === "de" ? "Dunkel" : "Dark";
  }
  return language === "de" ? "Hell" : "Light";
}

export function SiteShell({ children, chatConfigured = false }: SiteShellProps) {
  const pathname = usePathname();
  const [themePref, setThemePref] = useState<ThemePreference>("system");
  const [mounted, setMounted] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSeedPrompt, setChatSeedPrompt] = useState<string | null>(null);
  const [language, setLanguage] = useState<AppLanguage>("de");
  const [menuOpen, setMenuOpen] = useState(false);
  const nightHero = pathname === "/" || pathname === "/live";
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
      setLanguage(readLanguageFromStorage());
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
    if (!mounted) {
      return;
    }
    document.documentElement.lang = language;
    window.localStorage.setItem("speicherpilot-language", language);
    const url = new URL(window.location.href);
    if (language === "en") {
      url.searchParams.set("lang", "en");
    } else {
      url.searchParams.delete("lang");
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [language, mounted]);

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === "#ai-chat") {
        setChatOpen(true);
      }
    };
    const handleOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ prompt?: string }>;
      if (customEvent.detail?.prompt) {
        setChatSeedPrompt(customEvent.detail.prompt);
      }
      setChatOpen(true);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    window.addEventListener("speicherpilot:open-ai-chat", handleOpen);
    return () => {
      window.removeEventListener("hashchange", openFromHash);
      window.removeEventListener("speicherpilot:open-ai-chat", handleOpen);
    };
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
      const hero = document.querySelector(".day-hero");
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

  const tx = (de: string, en: string) => (language === "de" ? de : en);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      <div className="relative min-h-screen bg-background text-foreground">
        <a
          href="#inhalt"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[80] focus:bg-card focus:px-3 focus:py-2"
        >
          {tx("Zum Inhalt", "Skip to content")}
        </a>
        <header className={`site-header sticky top-0 z-40 h-16 border-b ${overHero ? `is-over-hero border-transparent ${atTop ? "is-hero-top bg-transparent" : "is-hero-scrolled"}` : "border-[var(--linie)] bg-[var(--bg)] text-foreground"}`}>
          <div className="mx-auto flex h-16 w-full max-w-[1360px] items-center justify-between gap-3 px-5 md:px-8">
            <BrandLockup />
            <nav className="hidden items-center gap-7 text-sm font-medium md:flex" aria-label={tx("Hauptnavigation", "Primary")}>
              {NAV.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={active ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}
                    aria-current={active ? "page" : undefined}
                  >
                    {language === "de" ? item.de : item.en}
                  </Link>
                );
              })}
            </nav>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-current focus-visible:ring-2 focus-visible:ring-ring"
                aria-pressed={mounted ? resolvedTheme === "dark" : undefined}
                aria-label={tx("Darstellung", "Appearance")}
                onClick={() => setThemePref(resolvedTheme === "dark" ? "light" : "dark")}
              >
                {resolvedTheme === "dark" ? <Sun className="size-5" strokeWidth={1.5} aria-hidden /> : <Moon className="size-5" strokeWidth={1.5} aria-hidden />}
              </button>
              <div className="num inline-flex overflow-hidden rounded-md border border-border-strong text-[12px]" role="group" aria-label={tx("Sprache", "Language")}>
                {(["de", "en"] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={`h-8 px-2.5 focus-visible:ring-2 focus-visible:ring-ring ${language === code ? "bg-foreground text-background" : "text-foreground"}`}
                    aria-pressed={language === code}
                    onClick={() => setLanguage(code)}
                  >
                    {code.toUpperCase()}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-expanded={menuOpen}
                aria-label={tx("Menü", "Menu")}
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <X className="size-4" strokeWidth={1.5} /> : <Menu className="size-4" strokeWidth={1.5} />}
              </button>
            </div>
          </div>
          {menuOpen ? (
            <div className="border-t border-border bg-card px-5 py-4 md:px-8">
              <nav className="flex flex-col gap-3 text-sm font-medium md:hidden" aria-label={tx("Hauptnavigation", "Primary")}>
                {NAV.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
                    {language === "de" ? item.de : item.en}
                  </Link>
                ))}
              </nav>
              <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={tx("Erscheinungsbild", "Appearance")}>
                {(
                  [
                    { key: "system" as const, icon: Monitor },
                    { key: "light" as const, icon: Sun },
                    { key: "dark" as const, icon: Moon },
                  ] as const
                ).map(({ key, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setThemePref(key)}
                    aria-pressed={themePref === key}
                    className={`inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm ${themePref === key ? "border-foreground bg-foreground text-background" : "border-border"}`}
                  >
                    <Icon className="size-4" strokeWidth={1.5} aria-hidden />
                    {themeLabel(key, language)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </header>
        <main id="inhalt">{children}</main>
        <BessAiChatOverlay
          configured={chatConfigured}
          open={chatOpen}
          onClose={() => {
            setChatOpen(false);
            setChatSeedPrompt(null);
            if (window.location.hash === "#ai-chat") {
              window.history.replaceState(null, "", window.location.pathname + window.location.search);
            }
          }}
          seedPrompt={chatSeedPrompt}
        />
        <footer className="border-t border-border">
          <div className="mx-auto max-w-[1200px] px-5 pt-4 md:px-8">
            <nav className="legal-footer" aria-label={tx("Rechtliches", "Legal")}>
              <Link href="/impressum">{tx("Impressum", "Legal notice")}</Link>
              <Link href="/datenschutz">{tx("Datenschutz", "Privacy")}</Link>
            </nav>
          </div>
          <div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-8 text-sm text-muted-foreground md:grid-cols-3 md:px-8">
            <div>
              <details className="site-fold">
              <summary className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Quellen", "Sources")}</summary>
              <ul className="mt-3 space-y-1.5">
                <li>
                  <a className="text-primary underline underline-offset-[3px]" href="https://energy-charts.info/" target="_blank" rel="noreferrer">
                    Energy-Charts
                  </a>
                </li>
                <li>
                  <a className="text-primary underline underline-offset-[3px]" href="https://www.ise.fraunhofer.de/" target="_blank" rel="noreferrer">
                    Fraunhofer ISE
                  </a>
                </li>
                <li>
                  <a className="text-primary underline underline-offset-[3px]" href="https://www.netztransparenz.de/" target="_blank" rel="noreferrer">
                    Netztransparenz
                  </a>
                </li>
                <li>
                  <a className="text-primary underline underline-offset-[3px]" href="https://www.marktstammdatenregister.de/" target="_blank" rel="noreferrer">
                    MaStR
                  </a>
                </li>
              </ul>
              </details>
              <details className="site-fold">
                <summary className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Glossar", "Glossary")}</summary>
                <p className="mt-3">
                  <Link href="/methodik#glossar">{tx("Begriffe in der Methodik", "Terms in the method")}</Link>
                </p>
              </details>
            </div>
            <p>
              <Link href="/szenarien">{tx("Szenarien rechnen", "Run scenarios")}</Link>
            </p>
            <p>
              {tx(
                "Illustratives Modell, keine Beschaffungs- oder Anlagenberatung.",
                "Illustrative model, not procurement or plant advice."
              )}
            </p>
            <div>
              <div className="flex flex-wrap gap-2" role="group" aria-label={tx("Erscheinungsbild", "Appearance")}>
                {(["system", "light", "dark"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={mounted && themePref === key}
                    onClick={() => setThemePref(key)}
                    className={`h-8 rounded-md border px-3 text-sm ${themePref === key ? "border-foreground bg-foreground text-background" : "border-border"}`}
                  >
                    {themeLabel(key, language)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </LanguageContext.Provider>
  );
}
