"use client";

import { useCallback, useId, useRef } from "react";

import { frontIndexFromKey, snapFrontIndex } from "@/lib/frontSlider";
import simStyles from "@/components/monat-v1/simulator-fahrweisen.module.css";

export function FrontSlider({
  value,
  count,
  namedIndices,
  onChange,
  ariaValueText,
  label = "Fahrweise",
  id,
}: {
  value: number;
  count: number;
  namedIndices: ReadonlyArray<number>;
  onChange: (index: number) => void;
  ariaValueText: string;
  label?: string;
  id?: string;
}) {
  const genId = useId();
  const labelId = `${id ?? genId}-label`;
  const sliderId = id ?? `${genId}-slider`;
  const trackRef = useRef<HTMLDivElement>(null);
  const last = Math.max(0, count - 1);
  const pct = last === 0 ? 0 : (value / last) * 100;
  const named = new Set(namedIndices);

  const applyClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el || count <= 0) {
        return;
      }
      const rect = el.getBoundingClientRect();
      const pad = 22;
      const start = rect.left + pad;
      const span = Math.max(0, rect.width - pad * 2);
      onChange(snapFrontIndex(clientX, start, span, count));
    },
    [count, onChange],
  );

  const onPointerDown = (ev: React.PointerEvent<HTMLDivElement>) => {
    ev.preventDefault();
    ev.currentTarget.setPointerCapture(ev.pointerId);
    ev.currentTarget.focus();
    applyClientX(ev.clientX);
  };

  const onPointerMove = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (!ev.currentTarget.hasPointerCapture(ev.pointerId)) {
      return;
    }
    applyClientX(ev.clientX);
  };

  const onKeyDown = (ev: React.KeyboardEvent<HTMLDivElement>) => {
    const next = frontIndexFromKey(ev.key, value, count);
    if (next == null) {
      return;
    }
    ev.preventDefault();
    onChange(next);
  };

  return (
    <div className={simStyles.sliderRow}>
      <p className={simStyles.sliderLabel} id={labelId}>
        {label}
      </p>
      <div
        ref={trackRef}
        id={sliderId}
        className={simStyles.frontTrack}
        role="slider"
        tabIndex={0}
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={last}
        aria-valuenow={value}
        aria-valuetext={ariaValueText}
        data-testid="sim-front-slider"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
      >
        <span className={simStyles.frontTrackLine} aria-hidden="true" />
        <span className={simStyles.frontTicks} aria-hidden="true">
          {Array.from({ length: count }, (_, i) => (
            <i
              key={i}
              className={named.has(i) ? simStyles.frontTickNamed : simStyles.frontTick}
              style={{ left: `${last === 0 ? 0 : (i / last) * 100}%` }}
            />
          ))}
        </span>
        <span className={simStyles.frontThumb} style={{ left: `${pct}%` }} aria-hidden="true" />
      </div>
      <p className={simStyles.sliderHint}>
        Rastet auf {count} vorgerechneten Front-Punkten{"\u00A0"}·{"\u00A0"}Pfeiltasten
      </p>
    </div>
  );
}
