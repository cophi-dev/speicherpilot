"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

/** SVG user-units fontSize so rendered typography is at least `targetPx` when the SVG is scaled. */
export function useTypographicSvgFontSize(
  ref: RefObject<SVGSVGElement | null>,
  viewBoxWidth: number,
  targetPx = 12,
): number {
  const [fontSize, setFontSize] = useState(targetPx);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || viewBoxWidth <= 0) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w <= 0) return;
      const vbW = Math.max(el.viewBox.baseVal.width || 0, viewBoxWidth);
      let fsUnits = Math.ceil((targetPx * vbW) / w);
      while (fsUnits * (w / vbW) < targetPx - 1e-4) fsUnits += 1;
      setFontSize(fsUnits);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, viewBoxWidth, targetPx]);
  return fontSize;
}