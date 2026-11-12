"use client";

import { useCallback, useState, type KeyboardEvent, type MouseEvent, type TouchEvent } from "react";

import { chartIndexFromKey, nearestIndexFromClientX } from "@/lib/chartNearestIndex";

export type SvgChartProbePick = (
  clientX: number,
  target: HTMLDivElement,
) => number;

export function useSvgChartProbe(pointCount: number, pickIndex?: SvgChartProbePick) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  const activeIndex = focusIndex ?? hoverIndex;

  const pickFromClientX = useCallback(
    (clientX: number, target: HTMLDivElement) => {
      const rect = target.getBoundingClientRect();
      const idx = pickIndex
        ? pickIndex(clientX, target)
        : nearestIndexFromClientX(clientX, rect, pointCount, target.scrollLeft);
      const clamped = Math.min(Math.max(0, idx), Math.max(0, pointCount - 1));
      setHoverIndex(clamped);
      setFocusIndex(null);
    },
    [pointCount, pickIndex],
  );

  const onMouseMove = useCallback(
    (ev: MouseEvent<HTMLDivElement>) => {
      if (pointCount <= 0) {
        return;
      }
      pickFromClientX(ev.clientX, ev.currentTarget);
    },
    [pickFromClientX, pointCount],
  );

  const onMouseLeave = useCallback(() => setHoverIndex(null), []);

  const onTouch = useCallback(
    (ev: TouchEvent<HTMLDivElement>) => {
      const touch = ev.touches[0];
      if (!touch || pointCount <= 0) {
        return;
      }
      pickFromClientX(touch.clientX, ev.currentTarget);
    },
    [pickFromClientX, pointCount],
  );

  const onKeyDown = useCallback(
    (ev: KeyboardEvent<HTMLDivElement>) => {
      if (pointCount <= 0) {
        return;
      }
      const next = chartIndexFromKey(ev.key, focusIndex ?? hoverIndex, pointCount);
      if (next === null) {
        return;
      }
      ev.preventDefault();
      setFocusIndex(next);
      setHoverIndex(null);
    },
    [focusIndex, hoverIndex, pointCount],
  );

  return {
    activeIndex,
    onMouseMove,
    onMouseLeave,
    onTouch,
    onKeyDown,
    setHoverIndex,
    setFocusIndex,
  };
}
