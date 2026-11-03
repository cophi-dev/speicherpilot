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

function scrollToHash() {
  if (typeof window === "undefined") {
    return;
  }
  const raw = window.location.hash;
  if (!raw) {
    return;
  }
  const id = resolveMethodikHash(raw);
  const target = document.getElementById(id);
  if (!target) {
    return;
  }
  openDetailsAncestors(target);
  requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

/** Opens collapsed sections and scrolls for /methodik#… deep links (SSR keeps ids in HTML). */
export function MethodikHashScroll() {
  useEffect(() => {
    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);
  return null;
}
