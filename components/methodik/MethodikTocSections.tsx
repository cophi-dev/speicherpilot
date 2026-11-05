"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

export function MethodikTocSections({
  summary,
  children,
}: {
  summary: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || typeof window.matchMedia !== "function") {
      return undefined;
    }
    const mq = window.matchMedia("(max-width: 959px)");
    const sync = () => {
      node.open = !mq.matches;
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <details ref={ref} className="methodik-toc-sections">
      <summary>{summary}</summary>
      {children}
    </details>
  );
}
