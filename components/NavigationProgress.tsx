"use client";

import { useEffect, useState } from "react";

const NAV_EVENT = "speicherpilot-nav";

/** Tell the top progress line that a client navigation has started. */
export function markNavigationPending() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(NAV_EVENT));
}

/**
 * Thin bar at the top of the viewport while a client navigation is in flight.
 * It does not replace the page, so the layout and the scroll position stay.
 */
export function NavigationProgress({ label }: { label: string }) {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let stop = 0;
    const arm = () => {
      setPending(true);
      window.clearTimeout(stop);
      stop = window.setTimeout(() => setPending(false), 8000);
    };
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor || anchor.hasAttribute("download")) {
        return;
      }
      if (anchor.target && anchor.target !== "_self") {
        return;
      }
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) {
        return;
      }
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) {
        return;
      }
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      arm();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener(NAV_EVENT, arm);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(NAV_EVENT, arm);
      window.clearTimeout(stop);
    };
  }, []);

  useEffect(() => {
    if (!pending) {
      return;
    }
    const startUrl = `${window.location.pathname}${window.location.search}`;
    const startSize = document.querySelector("main")?.textContent?.length ?? 0;
    const timer = window.setInterval(() => {
      const url = `${window.location.pathname}${window.location.search}`;
      const size = document.querySelector("main")?.textContent?.length ?? 0;
      if (url !== startUrl && Math.abs(size - startSize) > 80) {
        setPending(false);
      }
    }, 80);
    return () => window.clearInterval(timer);
  }, [pending]);

  if (!pending) {
    return null;
  }
  return (
    <>
      <div className="nav-progress" aria-hidden="true" />
      <p className="sr-only" aria-live="polite">
        {label}
      </p>
    </>
  );
}
