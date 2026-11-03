"use client";

import { useEffect } from "react";

import { resolveMethodikHash } from "@/components/methodik/methodikAnchors";

function openDetailsAncestors(node: HTMLElement | null) {
  let current: HTMLElement | null = node;
  while (current) {
    if (current.tagName === "DETAILS") {
      (current as HTMLDetailsElement).open = true;
    }
    current = current.parentElement;
  }
}

function scrollToId(id: string) {
  const target = document.getElementById(id);
  if (!target) {
    return;
  }
  openDetailsAncestors(target);
  requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function scrollToHash() {
  if (typeof window === "undefined") {
    return;
  }
  const raw = window.location.hash;
  if (!raw) {
    return;
  }
  scrollToId(resolveMethodikHash(raw));
}

/** Opens collapsed sections and scrolls for /methodik#… deep links (SSR keeps ids in HTML). */
export function MethodikHashScroll() {
  useEffect(() => {
    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    const root = document.querySelector(".methodik");
    function onAnchorClick(event: Event) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const link = target.closest('a[href^="#"]');
      if (!link || !root?.contains(link)) {
        return;
      }
      const href = link.getAttribute("href");
      if (!href || href === "#") {
        return;
      }
      const id = resolveMethodikHash(href);
      const current = window.location.hash.replace(/^#/, "");
      if (current === id) {
        event.preventDefault();
        scrollToId(id);
      }
    }
    root?.addEventListener("click", onAnchorClick);
    return () => {
      window.removeEventListener("hashchange", scrollToHash);
      root?.removeEventListener("click", onAnchorClick);
    };
  }, []);
  return null;
}
