"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Avoid shipping collapsed methodik bodies in the initial HTML (gate: ≤400 kB). */
export function LazyMethodikBody({ sectionId, children }: { sectionId: string; children: ReactNode }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const node = document.getElementById(sectionId);
    if (!node || !(node instanceof HTMLDetailsElement)) {
      return;
    }
    const sync = () => setShow(node.open);
    sync();
    node.addEventListener("toggle", sync);
    return () => node.removeEventListener("toggle", sync);
  }, [sectionId]);

  if (typeof window === "undefined") {
    return null;
  }

  return show ? children : null;
}
