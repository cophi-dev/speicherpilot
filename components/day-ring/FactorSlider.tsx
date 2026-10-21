import { useId } from "react";

import { LIVE_DISPATCH_FACTORS, type LiveDispatchFactor } from "@/lib/liveFleetDispatch";

const INDEX = new Map(LIVE_DISPATCH_FACTORS.map((factor, index) => [factor, index]));

export function FactorSlider({
  factor,
  valueText,
  label,
  saturationIndex,
  onChange,
}: {
  factor: LiveDispatchFactor;
  valueText: string;
  label: string;
  saturationIndex: number | null;
  onChange: (factor: LiveDispatchFactor) => void;
}) {
  const inputId = useId();
  const index = INDEX.get(factor) ?? 0;
  const fill = (index / (LIVE_DISPATCH_FACTORS.length - 1)) * 100;
  const hatchFrom = saturationIndex === null ? 100 : (saturationIndex / (LIVE_DISPATCH_FACTORS.length - 1)) * 100;

  return (
    <div className="day-slider-block">
      <label className="day-slider-label" htmlFor={inputId}>
        {label}
      </label>
      <div className="day-slider">
        <div
          className="day-slider-track"
          aria-hidden="true"
          style={{ ["--fill" as string]: `${fill}%`, ["--hatch" as string]: `${hatchFrom}%` }}
        />
        <input
          id={inputId}
          type="range"
          min={0}
          max={LIVE_DISPATCH_FACTORS.length - 1}
          step={1}
          value={index}
          aria-valuemin={0}
          aria-valuemax={LIVE_DISPATCH_FACTORS.length - 1}
          aria-valuenow={index}
          aria-valuetext={valueText}
          onChange={(event) => {
            const next = LIVE_DISPATCH_FACTORS[Number(event.target.value)] ?? factor;
            onChange(next);
          }}
        />
      </div>
      <div className="day-slider-stops">
        {LIVE_DISPATCH_FACTORS.map((step) => (
          <button key={step} type="button" className={step === factor ? "is-current" : undefined} onClick={() => onChange(step)}>
            ×{step}
          </button>
        ))}
      </div>
    </div>
  );
}
