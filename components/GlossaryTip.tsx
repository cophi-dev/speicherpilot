"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { glossaryEntry, type GlossaryId } from "@/lib/glossary";

type Language = "de" | "en";

export function GlossaryTip({ id, language }: { id: GlossaryId; language: Language }) {
  const entry = glossaryEntry(id);
  const term = language === "de" ? entry.term.de : entry.term.en;
  const text = language === "de" ? entry.text.de : entry.text.en;
  const tipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);
  const open = pinned || hovered || focused;

  useEffect(() => {
    if (!open) {
      return;
    }
    function place() {
      const node = rootRef.current;
      if (!node) {
        return;
      }
      const rect = node.getBoundingClientRect();
      const half = 128;
      const left = Math.min(window.innerWidth - half - 12, Math.max(half + 12, rect.left + rect.width / 2));
      setBox({ top: rect.bottom + 8, left });
    }
    place();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPinned(false);
        setHovered(false);
        setFocused(false);
      }
    }
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setPinned(false);
      }
    }
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const bubble =
    open && box && typeof document !== "undefined"
      ? createPortal(
          <span
            role="tooltip"
            id={tipId}
            style={{ top: box.top, left: box.left }}
            className="fixed z-[80] w-64 -translate-x-1/2 rounded-md border border-border bg-card p-3 text-left text-sm font-normal tracking-normal text-foreground normal-case shadow-none"
          >
            <span className="block font-medium">{term}</span>
            <span className="mt-1 block text-muted-foreground">{text}</span>
          </span>,
          document.body
        )
      : null;

  return (
    <span
      ref={rootRef}
      className="relative inline-flex align-middle"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border text-[12px] leading-none text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        aria-label={language === "de" ? `Begriff erklären: ${term}` : `Explain term: ${term}`}
        onClick={() => setPinned((value) => !value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <span aria-hidden="true">i</span>
      </button>
      {bubble}
    </span>
  );
}
