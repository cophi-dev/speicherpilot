"use client";

import { useEffect, useState } from "react";

import { stepFromLayout } from "@/lib/storyStep";

/** Reading line. A step becomes current once its top passes this share of the viewport. */
const READING_LINE = 0.58;

export function useStoryStep(nodesRef: { readonly current: ReadonlyArray<HTMLElement | null> }, count: number) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      const tops: number[] = [];
      const heights: number[] = [];
      for (let index = 0; index < count; index += 1) {
        const node = nodesRef.current[index];
        if (!node) {
          tops.push(Number.POSITIVE_INFINITY);
          heights.push(0);
          continue;
        }
        const rect = node.getBoundingClientRect();
        tops.push(rect.top);
        heights.push(rect.height);
      }
      setStep(stepFromLayout(tops, heights, window.innerHeight * READING_LINE));
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [nodesRef, count]);

  return step;
}
