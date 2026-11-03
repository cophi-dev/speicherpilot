"use client";

import { useEffect } from "react";

/** Opens and scrolls to #testnetz-n1 when linked from /netz redirect. */
export function TestnetzHashScroll() {
  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#testnetz-n1") {
      return;
    }
    const node = document.getElementById("testnetz-n1");
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  return null;
}
