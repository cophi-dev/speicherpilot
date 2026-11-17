"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

const KEY = "speicherpilot-fleet-scroll";

/** Stellt Scroll-Y nach Flotten-Query-Wechsel wieder her (siehe FleetScenarioLink). */
export function FleetScrollRestore() {
  const searchParams = useSearchParams();
  const faktor = searchParams.get("faktor");
  const fahrweise = searchParams.get("fahrweise");

  useEffect(() => {
    const rememberScroll = (event: MouseEvent) => {
      const raw = event.target;
      const node = raw instanceof Element ? raw : raw instanceof Node ? raw.parentElement : null;
      const target = node?.closest("[data-fleet-scenario-link]");
      if (!target) {
        return;
      }
      sessionStorage.setItem(KEY, String(window.scrollY));
    };
    document.addEventListener("click", rememberScroll, true);
    return () => document.removeEventListener("click", rememberScroll, true);
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem(KEY);
    if (raw == null) {
      return;
    }
    sessionStorage.removeItem(KEY);
    const y = Number(raw);
    if (!Number.isFinite(y)) {
      return;
    }
    let done = false;
    const tryRestore = () => {
      if (done) {
        return;
      }
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll + 2 >= y) {
        window.scrollTo(0, y);
        done = true;
        return;
      }
      window.scrollTo(0, maxScroll);
    };
    tryRestore();
    requestAnimationFrame(tryRestore);
    const interval = window.setInterval(tryRestore, 50);
    window.setTimeout(() => {
      window.clearInterval(interval);
      if (!done) {
        window.scrollTo(0, y);
      }
    }, 4000);
  }, [faktor, fahrweise]);

  return null;
}