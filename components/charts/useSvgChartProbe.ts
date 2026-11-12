"use client";

import { useCallback, useState, type KeyboardEvent, type MouseEvent, type TouchEvent } from "react";

import { chartIndexFromKey, nearestIndexFromClientX } from "@/lib/chartNearestIndex";

export function useSvgChartProbe(pointCount: number) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  const activeIndex = focusIndex ?? hoverIndex;

  const pickFromClientX = useCallback(
    (clientX: number, target: HTMLDivElement) => {
      const rect = target.getBoundingClientRect();
      const idx = nearestIndexFromClientX(clientX, rect, pointCount, target.scrollLeft);
      setHoverIndex(idx);
      setFocusIndex(null);
    },
    [pointCount],
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
