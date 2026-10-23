"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { useLanguage } from "@/components/language-context";
import { hourToDeg, polarPoint, RING_R0, socRingGeometry } from "@/lib/dayRingScale";
import type { LiveDispatchPoint } from "@/lib/liveFleetDispatch";

import type { RingUnit } from "@/components/day-ring/DayRing";

type Point = { x: number; y: number };
type ViewBox = { x: number; y: number; w: number; h: number };

const SOC_ANGLE = 48;

export function shiftArc(points: LiveDispatchPoint[]): { start: number; end: number } | null {
  if (points.length === 0) {
    return null;
  }
  const charge = points.reduce((best, point) => (point.chargeMw > best.chargeMw ? point : best), points[0]);
  if (!charge || charge.chargeMw <= 0) {
    return null;
  }
  const dischargePool = points.filter((point) => point.hour >= 17);
  const discharge = (dischargePool.length > 0 ? dischargePool : points).reduce(
    (best, point) => (point.dischargeMw > best.dischargeMw ? point : best),
    dischargePool[0] ?? points[0]
  );
  return {
    start: hourToDeg(charge.hour) + 1.5,
    end: hourToDeg(discharge.hour) + 1.5,
  };
}

function ringKeyCopy(language: "de" | "en") {
  if (language === "de") {
    return {
      soc: "Ladezustand",
      shift: "verschoben",
      socExplain: "Ladezustand erklären",
      shiftExplain: "verschoben erklären",
      socText: "Ladezustand: wie voll der Modellspeicher zu jeder Stunde ist (0–100 %). Dickeres Band = vollerer Speicher.",
      shiftText:
        "verschoben: Energie, die der Modellspeicher in der Stunde mit der stärksten Ladung aufnimmt und am Abend zur Spitze wieder abgibt.",
    };
  }
  return {
    soc: "State of charge",
    shift: "shifted",
    socExplain: "Explain state of charge",
    shiftExplain: "Explain shifted energy",
    socText: "State of charge: how full the model storage is at each hour (0–100%). A thicker band means a fuller battery.",
    shiftText:
      "Shifted: energy the model storage takes in during the hour of strongest charging and gives back at the evening peak.",
  };
}

function KeyInfo({ label, text }: { label: string; text: string }) {
  const tipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      setOpen(false);
      buttonRef.current?.focus();
    }
    function onPointer(event: PointerEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || popRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <span className="day-key-info-wrap">
      <button
        ref={buttonRef}
        type="button"
        className="day-key-info"
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">i</span>
      </button>
      {open ? (
        <span ref={popRef} role="tooltip" id={tipId} className="day-key-pop">
          {text}
        </span>
      ) : null}
    </span>
  );
}

function place(point: Point, view: ViewBox): { left: string; top: string } {
  return {
    left: `${((point.x - view.x) / view.w) * 100}%`,
    top: `${((point.y - view.y) / view.h) * 100}%`,
  };
}

export function RingKeyLeaders({
  points,
  showSoc,
  showShift,
  unit,
  bold,
}: {
  points: LiveDispatchPoint[];
  showSoc: boolean;
  showShift: boolean;
  unit: RingUnit;
  bold: boolean;
}): ReactNode {
  const marks = keyMarks(points, showSoc, showShift, unit, bold);
  return (
    <>
      {marks.soc ? (
        <line
          className="day-key-leader day-key-leader-soc"
          x1={marks.soc.touch.x}
          y1={marks.soc.touch.y}
          x2={marks.soc.label.x}
          y2={marks.soc.label.y}
        />
      ) : null}
      {marks.shift ? (
        <line
          className="day-key-leader day-key-leader-shift"
          x1={marks.shift.touch.x}
          y1={marks.shift.touch.y}
          x2={marks.shift.label.x}
          y2={marks.shift.label.y}
        />
      ) : null}
    </>
  );
}

export function RingKeyLabels({
  points,
  showSoc,
  showShift,
  unit,
  bold,
  view,
  part,
}: {
  points: LiveDispatchPoint[];
  showSoc: boolean;
  showShift: boolean;
  unit: RingUnit;
  bold: boolean;
  view: ViewBox;
  part: "overlay" | "list";
}) {
  const marks = keyMarks(points, showSoc, showShift, unit, bold);
  if (!marks.soc && !marks.shift) {
    return null;
  }
  return <RingKeyLabelsInner marks={marks} view={view} part={part} />;
}

function RingKeyLabelsInner({
  marks,
  view,
  part,
}: {
  marks: { soc: { touch: Point; label: Point } | null; shift: { touch: Point; label: Point } | null };
  view: ViewBox;
  part: "overlay" | "list";
}) {
  const { language } = useLanguage();
  const copy = ringKeyCopy(language);
  if (part === "list") {
    return (
      <ul className="day-ring-key-list">
        {marks.soc ? (
          <li className="day-ring-key-soc">
            <span className="day-key-swatch" aria-hidden="true" />
            <span>{copy.soc}</span>
            <KeyInfo label={copy.socExplain} text={copy.socText} />
          </li>
        ) : null}
        {marks.shift ? (
          <li className="day-ring-key-shift">
            <span className="day-key-swatch day-key-swatch-shift" aria-hidden="true" />
            <span>{copy.shift}</span>
            <KeyInfo label={copy.shiftExplain} text={copy.shiftText} />
          </li>
        ) : null}
      </ul>
    );
  }
  return (
    <>
      {marks.soc ? (
        <p className="day-ring-key day-ring-key-soc" style={place(marks.soc.label, view)}>
          <span>{copy.soc}</span>
          <KeyInfo label={copy.socExplain} text={copy.socText} />
        </p>
      ) : null}
      {marks.shift ? (
        <p className="day-ring-key day-ring-key-shift" style={place(marks.shift.label, view)}>
          <span>{copy.shift}</span>
          <KeyInfo label={copy.shiftExplain} text={copy.shiftText} />
        </p>
      ) : null}
    </>
  );
}

function keyMarks(
  points: LiveDispatchPoint[],
  showSoc: boolean,
  showShift: boolean,
  unit: RingUnit,
  bold: boolean
): { soc: { touch: Point; label: Point } | null; shift: { touch: Point; label: Point } | null } {
  const soc = showSoc ? socMark(unit, bold) : null;
  const arc = showShift ? shiftArc(points) : null;
  const shift = arc ? shiftMark(arc.start, arc.end) : null;
  return { soc, shift };
}

function socMark(unit: RingUnit, bold: boolean): { touch: Point; label: Point } {
  const { radius, width } = socRingGeometry(unit, bold);
  const edge = radius + width / 2;
  return {
    touch: polarPoint(0, 0, edge, SOC_ANGLE),
    label: polarPoint(0, 0, edge + 36, SOC_ANGLE),
  };
}

function shiftMark(start: number, end: number): { touch: Point; label: Point } {
  const sweep = end >= start ? end - start : end + 360 - start;
  const mid = start + sweep / 2;
  const radius = RING_R0 - 36;
  return {
    touch: polarPoint(0, 0, radius, mid),
    label: polarPoint(0, 0, radius + 28, mid),
  };
}
