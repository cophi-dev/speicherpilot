"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";

/** Nach dem Mount: geschütztes Leerzeichen vor Einheiten in Textknoten (B1). */
export function DisplayUnitNormalizer({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) {
      return;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node = walker.nextNode();
    while (node) {
      if (node.parentElement?.closest("[data-skip-display-nbsp]")) {
        node = walker.nextNode();
        continue;
      }
      textNodes.push(node as Text);
      node = walker.nextNode();
    }
    for (const textNode of textNodes) {
      const raw = textNode.textContent ?? "";
      const next = insertDisplayUnitNbsp(raw);
      if (next !== raw) {
        textNode.textContent = next;
      }
    }
  });

  return (
    <div ref={ref} className="display-unit-normalizer" style={{ display: "contents" }}>
      {children}
    </div>
  );
}