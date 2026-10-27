"use client";

import { autoUpdate, flip, offset, shift, useFloating, type Middleware } from "@floating-ui/react";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

import { useLanguage } from "@/components/language-context";
import { hourToDeg, polarPoint, pxToUser, RING_R0, socRingGeometry } from "@/lib/dayRingScale";
import type { LiveDispatchPoint } from "@/lib/liveFleetDispatch";

import type { RingUnit } from "@/components/day-ring/DayRing";

type Point = { x: number; y: number };
type ViewBox = { x: number; y: number; w: number; h: number };
export type KeySegment = { x1: number; y1: number; x2: number; y2: number };

const SOC_ANGLE = 48;
/** 8px off the arc, plus half the 44px control, plus a short leader. */
export const SOC_PULL_PX = 42;
export const KEY_CLEARANCE_PX = 8;
const SHIFT_RADIUS = RING_R0 - 36;

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
      charge: "Laden",
      discharge: "Abgeben",
      legend: "Legende",
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
    charge: "Charge",
    discharge: "Discharge",
    legend: "Legend",
    socExplain: "Explain state of charge",
    shiftExplain: "Explain shifted energy",
    socText: "State of charge: how full the model storage is at each hour (0–100%). A thicker band means a fuller battery.",
    shiftText:
      "Shifted: energy the model storage takes in during the hour of strongest charging and gives back at the evening peak.",
  };
}

type Box = { left: number; right: number; top: number; bottom: number };

/** Positive when the boxes are apart, negative by the overlap on the tighter axis. */
export function rectGap(a: Box, b: Box): number {
  const dx = Math.max(a.left - b.right, b.left - a.right, 0);
  const dy = Math.max(a.top - b.bottom, b.top - a.bottom, 0);
  if (dx > 0 || dy > 0) {
    return Math.hypot(dx, dy);
  }
  const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return -Math.min(overlapX, overlapY);
}

/** Positive outside the rectangle, negative by the distance to the nearest edge. */
export function pointRectGap(x: number, y: number, rect: Box): number {
  const dx = Math.max(rect.left - x, 0, x - rect.right);
  const dy = Math.max(rect.top - y, 0, y - rect.bottom);
  if (dx > 0 || dy > 0) {
    return Math.hypot(dx, dy);
  }
  return -Math.min(x - rect.left, rect.right - x, y - rect.top, rect.bottom - y);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Point on the segment from `from` toward `to`, `gap` user units before `to`.
 * `mode` keeps the result on the allowed side of `radius` so the hairline cannot cross it.
 */
export function shortenLeader(from: Point, to: Point, gap: number, radius: number, mode: "inside" | "outside"): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len <= gap) {
    return { x: from.x, y: from.y };
  }
  const t = (len - gap) / len;
  const end = { x: from.x + dx * t, y: from.y + dy * t };
  const endRadius = Math.hypot(end.x, end.y);
  const crossed = mode === "outside" ? endRadius < radius - 0.05 : endRadius > radius + 0.05;
  if (crossed) {
    return { x: from.x, y: from.y };
  }
  return { x: round2(end.x), y: round2(end.y) };
}

export function socMark(unit: RingUnit, bold: boolean, viewW: number, framePx: number, pullPx = SOC_PULL_PX): { touch: Point; label: Point } {
  const { innerEdge } = socRingGeometry(unit, bold);
  const pull = pxToUser(pullPx, viewW, framePx);
  return {
    touch: polarPoint(0, 0, innerEdge, SOC_ANGLE),
    label: polarPoint(0, 0, Math.max(1, innerEdge - pull), SOC_ANGLE),
  };
}

export function shiftMark(start: number, end: number, viewW: number, framePx: number): { touch: Point; label: Point; lineEnd: Point } {
  const sweep = end >= start ? end - start : end + 360 - start;
  const mid = start + sweep / 2;
  const touch = polarPoint(0, 0, SHIFT_RADIUS, mid);
  const label = polarPoint(0, 0, SHIFT_RADIUS + 28, mid);
  const lineEnd = shortenLeader(touch, label, pxToUser(KEY_CLEARANCE_PX, viewW, framePx), SHIFT_RADIUS, "outside");
  return { touch, label, lineEnd };
}

const avoidShiftRow: Middleware = {
  name: "avoidShiftRow",
  fn({ x, y, rects }) {
    const row = document.querySelector(".day-ring-key-list .day-ring-key-shift");
    if (!row) {
      return {};
    }
    const rowBox = row.getBoundingClientRect();
    if (rowBox.width <= 0 || rowBox.height <= 0) {
      return {};
    }
    const pop = { left: x, right: x + rects.floating.width, top: y, bottom: y + rects.floating.height };
    const overlaps = pop.left < rowBox.right && pop.right > rowBox.left && pop.top < rowBox.bottom && pop.bottom > rowBox.top;
    if (!overlaps) {
      return {};
    }
    const list = row.closest(".day-ring-key-list");
    if (!list) {
      return {};
    }
    const listBox = list.getBoundingClientRect();
    const gap = 8;
    const below = listBox.bottom + gap;
    const above = listBox.top - gap - rects.floating.height;
    const viewportBottom = window.innerHeight - 16;
    const yNext = below + rects.floating.height <= viewportBottom ? below : Math.max(16, above);
    return { y: yNext };
  },
};

function KeyInfo({ label, text }: { label: string; text: string }) {
  const tipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles } = useFloating({
    open,
    strategy: "fixed",
    placement: "bottom-end",
    middleware: [offset(6), flip(), shift({ padding: 16 }), avoidShiftRow],
    whileElementsMounted: autoUpdate,
  });

  const setPop = useCallback(
    (node: HTMLSpanElement | null) => {
      refs.setFloating(node);
    },
    [refs]
  );

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
      if (buttonRef.current?.contains(target) || refs.floating.current?.contains(target)) {
        return;
      }
      setOpen(false);
      buttonRef.current?.focus();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, refs]);

  return (
    <span className="day-key-info-wrap">
      <button
        ref={(node) => {
          buttonRef.current = node;
          refs.setReference(node);
        }}
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
        <span ref={setPop} role="tooltip" id={tipId} className="day-key-pop" style={floatingStyles}>
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

function segmentOf(from: Point, to: Point): KeySegment | null {
  if (Math.hypot(from.x - to.x, from.y - to.y) < 0.8) {
    return null;
  }
  return { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
}

export function RingKeyLeaders({
  points,
  showSoc,
  showShift,
  unit,
  bold,
  view,
  framePx,
  pullPx,
  measured,
  socLine,
  shiftLine,
}: {
  points: LiveDispatchPoint[];
  showSoc: boolean;
  showShift: boolean;
  unit: RingUnit;
  bold: boolean;
  view: ViewBox;
  framePx: number;
  pullPx: number;
  measured: boolean;
  socLine: KeySegment | null;
  shiftLine: KeySegment | null;
}): ReactNode {
  const marks = keyMarks(points, showSoc, showShift, unit, bold, view.w, framePx, pullPx);
  const soc = measured ? socLine : marks.soc ? segmentOf(marks.soc.touch, marks.soc.lineEnd) : null;
  const shift = measured ? shiftLine : marks.shift ? segmentOf(marks.shift.touch, marks.shift.lineEnd) : null;
  return (
    <>
      {soc ? (
        <line className="day-key-leader day-key-leader-soc" x1={soc.x1} y1={soc.y1} x2={soc.x2} y2={soc.y2} />
      ) : null}
      {shift ? (
        <>
          <line className="day-key-leader-halo" x1={shift.x1} y1={shift.y1} x2={shift.x2} y2={shift.y2} />
          <line className="day-key-leader day-key-leader-shift" x1={shift.x1} y1={shift.y1} x2={shift.x2} y2={shift.y2} />
        </>
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
  framePx,
  pullPx,
  part,
  signs = false,
}: {
  points: LiveDispatchPoint[];
  showSoc: boolean;
  showShift: boolean;
  unit: RingUnit;
  bold: boolean;
  view: ViewBox;
  framePx: number;
  pullPx: number;
  part: "overlay" | "list";
  /** Mint charge and coral discharge wedges, reference ring only. */
  signs?: boolean;
}) {
  const marks = keyMarks(points, showSoc, showShift, unit, bold, view.w, framePx, pullPx);
  if (!marks.soc && !marks.shift && !signs) {
    return null;
  }
  return <RingKeyLabelsInner marks={marks} view={view} part={part} signs={signs} />;
}

function RingKeyLabelsInner({
  marks,
  view,
  part,
  signs,
}: {
  marks: ReturnType<typeof keyMarks>;
  view: ViewBox;
  part: "overlay" | "list";
  signs: boolean;
}) {
  const { language } = useLanguage();
  const copy = ringKeyCopy(language);
  if (part === "list") {
    return (
      <ul className="day-ring-key-list" aria-label={signs ? copy.legend : undefined}>
        {signs ? (
          <>
            <li className="day-ring-key-charge">
              <span className="day-key-swatch" aria-hidden="true" />
              <span>{copy.charge}</span>
            </li>
            <li className="day-ring-key-discharge">
              <span className="day-key-swatch" aria-hidden="true" />
              <span>{copy.discharge}</span>
            </li>
          </>
        ) : null}
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
  bold: boolean,
  viewW: number,
  framePx: number,
  pullPx: number
) {
  const soc = showSoc ? socLineMark(unit, bold, viewW, framePx, pullPx) : null;
  const arc = showShift ? shiftArc(points) : null;
  const shift = arc ? shiftMark(arc.start, arc.end, viewW, framePx) : null;
  return { soc, shift };
}

function socLineMark(unit: RingUnit, bold: boolean, viewW: number, framePx: number, pullPx: number) {
  const mark = socMark(unit, bold, viewW, framePx, pullPx);
  const { innerEdge } = socRingGeometry(unit, bold);
  return {
    ...mark,
    lineEnd: shortenLeader(mark.touch, mark.label, pxToUser(KEY_CLEARANCE_PX, viewW, framePx), innerEdge, "inside"),
  };
}

export type KeyLayout = {
  fallback: boolean;
  pullPx: number;
  /** False until a desktop measurement replaces the geometric leaders. */
  measured: boolean;
  socLine: KeySegment | null;
  shiftLine: KeySegment | null;
};

function userToScreen(svg: SVGSVGElement, x: number, y: number): { x: number; y: number } | null {
  if (typeof svg.getScreenCTM !== "function" || typeof svg.createSVGPoint !== "function") {
    return null;
  }
  const ctm = svg.getScreenCTM();
  if (!ctm) {
    return null;
  }
  const pt = svg.createSVGPoint();
  pt.x = x;
  pt.y = y;
  const screen = pt.matrixTransform(ctm);
  return { x: screen.x, y: screen.y };
}

function approachEnd(
  svg: SVGSVGElement,
  from: Point,
  toward: Point,
  rect: DOMRect,
  gapPx: number,
  allowed: (point: Point) => boolean
): Point {
  let lo = 0;
  let best = from;
  let hi = 1;
  for (let step = 0; step < 14; step += 1) {
    const t = (lo + hi) / 2;
    const point = { x: from.x + (toward.x - from.x) * t, y: from.y + (toward.y - from.y) * t };
    const screen = userToScreen(svg, point.x, point.y);
    if (!screen || !allowed(point) || pointRectGap(screen.x, screen.y, rect) < gapPx) {
      hi = t;
      continue;
    }
    best = point;
    lo = t;
  }
  return { x: round2(best.x), y: round2(best.y) };
}

function labelOverflowsArc(rect: DOMRect, origin: { x: number; y: number }, innerPx: number): number {
  const corners = [
    [rect.left, rect.top],
    [rect.right, rect.top],
    [rect.right, rect.bottom],
    [rect.left, rect.bottom],
  ];
  let maxRadius = 0;
  for (const [x, y] of corners) {
    maxRadius = Math.max(maxRadius, Math.hypot(x - origin.x, y - origin.y));
  }
  return maxRadius - (innerPx - KEY_CLEARANCE_PX);
}

function geometryTooClose(svg: SVGSVGElement, rect: DOMRect): boolean {
  const nodes = svg.querySelectorAll<SVGGeometryElement>("path, circle, line");
  for (const node of nodes) {
    if (node.closest(".day-ticks") || node.classList.contains("day-soc") || node.classList.contains("day-key-leader") || node.classList.contains("day-key-leader-halo")) {
      continue;
    }
    if (typeof node.getTotalLength !== "function") {
      continue;
    }
    let length = 0;
    try {
      length = node.getTotalLength();
    } catch {
      continue;
    }
    if (!(length > 0)) {
      continue;
    }
    const samples = Math.min(180, Math.max(8, Math.ceil(length / 4)));
    for (let index = 0; index <= samples; index += 1) {
      const at = node.getPointAtLength((length * index) / samples);
      const screen = userToScreen(svg, at.x, at.y);
      if (screen && pointRectGap(screen.x, screen.y, rect) < KEY_CLEARANCE_PX) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Places the state-of-charge label inside the inner arc.
 * Returns null when the browser cannot map the viewBox (tests, first paint).
 * `fallback` is the desktop 2-item legend: the label box is within 8px of a path or the centre figure.
 */
export function measureRingKeys(
  frame: HTMLElement,
  points: LiveDispatchPoint[],
  showSoc: boolean,
  showShift: boolean,
  unit: RingUnit,
  bold: boolean,
  viewW: number,
  framePx: number,
  pullPx: number
): KeyLayout | null {
  const phone = typeof window.matchMedia === "function" && window.matchMedia("(max-width: 639px)").matches;
  if (phone || framePx < 320) {
    return { fallback: false, pullPx, measured: false, socLine: null, shiftLine: null };
  }
  const svg = frame.querySelector<SVGSVGElement>(".day-ring-svg");
  if (!svg || !userToScreen(svg, 0, 0)) {
    return null;
  }
  const marks = keyMarks(points, showSoc, showShift, unit, bold, viewW, framePx, pullPx);
  const soc = frame.querySelector<HTMLElement>("p.day-ring-key-soc");
  const shift = frame.querySelector<HTMLElement>("p.day-ring-key-shift");
  const { innerEdge } = socRingGeometry(unit, bold);
  const origin = userToScreen(svg, 0, 0);
  const rim = userToScreen(svg, innerEdge, 0);
  if (!origin || !rim) {
    return null;
  }
  const innerPx = Math.hypot(rim.x - origin.x, rim.y - origin.y);
  let nextPull = pullPx;
  let fallback = false;
  let nudged = false;
  if (soc && marks.soc) {
    const rect = soc.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const overflow = labelOverflowsArc(rect, origin, innerPx);
      if (overflow > 1) {
        const candidate = pullPx + overflow + 1;
        const room = innerEdge - pxToUser(candidate, viewW, framePx);
        if (room < 8 || candidate > 160) {
          fallback = true;
        } else {
          nextPull = candidate;
          nudged = true;
        }
      }
      if (!fallback && !nudged) {
        const center = frame.querySelector<HTMLElement>(".day-center");
        const centerBox = center?.getBoundingClientRect();
        const hitsCenter = !!centerBox && centerBox.width > 0 && centerBox.height > 0 && rectGap(rect, centerBox) < KEY_CLEARANCE_PX;
        if (hitsCenter || geometryTooClose(svg, rect)) {
          fallback = true;
        }
      }
    }
  }
  const placed = nudged ? keyMarks(points, showSoc, showShift, unit, bold, viewW, framePx, nextPull) : marks;
  const socLine =
    soc && placed.soc && !fallback && !nudged
      ? segmentOf(
          placed.soc.touch,
          approachEnd(svg, placed.soc.touch, placed.soc.label, soc.getBoundingClientRect(), KEY_CLEARANCE_PX, (point) => Math.hypot(point.x, point.y) <= innerEdge + 0.2)
        )
      : null;
  const shiftRect = shift?.getBoundingClientRect();
  const shiftLine =
    shift && placed.shift && shiftRect && shiftRect.width > 0
      ? segmentOf(
          placed.shift.touch,
          approachEnd(svg, placed.shift.touch, placed.shift.label, shiftRect, KEY_CLEARANCE_PX, (point) => Math.hypot(point.x, point.y) >= SHIFT_RADIUS - 0.2)
        )
      : null;
  return { fallback, pullPx: nextPull, measured: !nudged, socLine: nudged ? null : socLine, shiftLine };
}
