"use client";

import { useEffect, useState, type RefObject } from "react";

/** Misst die nutzbare Chart-Breite (volle Inhaltskolonne, kein fixes 1280-SVG). */
export function useMeasuredChartWidth(
  ref: RefObject<HTMLElement | null>,
  fallback: number
): number {
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = Math.floor(el.getBoundingClientRect().width);
      if (w > 0) setWidth(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return width;
}