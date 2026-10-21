"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { easeInOut, RING_MORPH_MS } from "@/lib/dayRingSmooth";

/** Interpolates a series over RING_MORPH_MS. The first frame is the next animation frame. */
export function useMorphedSeries(values: number[]): number[] {
  const signature = values.map((value) => value.toFixed(4)).join("|");
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const fromRef = useRef(values);
  const [shown, setShown] = useState(values);
  useLayoutEffect(() => {
    const target = valuesRef.current;
    const from = fromRef.current.slice();
    const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const unchanged = from.length === target.length && from.every((value, index) => value === target[index]);
    if (reduced || unchanged || typeof window.matchMedia !== "function") {
      fromRef.current = target;
      setShown((current) => (sameNumbers(current, target) ? current : target));
      return;
    }
    const started = performance.now();
    let frame = requestAnimationFrame(function tick(now: number) {
      const t = Math.min(1, (now - started) / RING_MORPH_MS);
      const next = t >= 1 ? target.slice() : from.map((value, index) => value + ((target[index] ?? value) - value) * easeInOut(t));
      fromRef.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [signature]);
  return shown;
}

function sameNumbers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
