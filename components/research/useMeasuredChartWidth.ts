"use client";

import { useEffect, useState, type RefObject } from "react";

import { chartShellContentWidth } from "@/lib/chartShellWidth";

/** Misst die nutzbare Chart-Breite (Inhalt minus Padding, kein Page-Border-Box). */
export function useMeasuredChartWidth(
  ref: RefObject<HTMLElement | null>,
  fallback: number
): number {
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = chartShellContentWidth(el);
      if (w > 0) setWidth(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return width;
}