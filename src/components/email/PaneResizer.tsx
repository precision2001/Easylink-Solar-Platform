"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A width the user sets by dragging, remembered in this browser.
 * Returns the width and the props for a drag handle.
 */
export function usePaneWidth(key: string, initial: number, min: number, max: number) {
  const [width, setWidth] = useState(initial);
  const clamp = useCallback((w: number) => Math.round(Math.min(max, Math.max(min, w))), [min, max]);

  useEffect(() => {
    let saved: number | null = null;
    try {
      const v = Number(window.localStorage.getItem(key));
      if (Number.isFinite(v) && v > 0) saved = v;
    } catch {
      /* storage unavailable */
    }
    if (saved !== null) {
      const w = clamp(saved);
      const t = setTimeout(() => setWidth(w), 0);
      return () => clearTimeout(t);
    }
  }, [key, clamp]);

  const save = useCallback(
    (w: number) => {
      try {
        window.localStorage.setItem(key, String(w));
      } catch {
        /* storage unavailable */
      }
    },
    [key],
  );

  const set = useCallback(
    (w: number) => {
      const c = clamp(w);
      setWidth(c);
      save(c);
    },
    [clamp, save],
  );

  return { width, set, reset: () => set(initial), min, max };
}

export function PaneResizer({
  label,
  width,
  set,
  reset,
  min,
  max,
}: {
  label: string;
  width: number;
  set: (w: number) => void;
  reset: () => void;
  min: number;
  max: number;
}) {
  const start = useRef<{ x: number; w: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      if (start.current) set(start.current.w + e.clientX - start.current.x);
    };
    const up = () => {
      start.current = null;
      setDragging(false);
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, set]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      onPointerDown={(e) => {
        e.preventDefault();
        start.current = { x: e.clientX, w: width };
        setDragging(true);
      }}
      onDoubleClick={reset}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") set(width - 24);
        if (e.key === "ArrowRight") set(width + 24);
      }}
      className="group relative z-10 -mx-[3px] hidden w-[7px] flex-none cursor-col-resize lg:block"
    >
      <span
        className="absolute inset-y-0 left-[3px] w-px transition-colors group-hover:w-[3px] group-hover:bg-[#1976D2] group-focus-visible:w-[3px] group-focus-visible:bg-[#1976D2]"
        style={{ background: dragging ? "#1976D2" : "#E2E8F0", width: dragging ? 3 : undefined, left: dragging ? 2 : undefined }}
      />
    </div>
  );
}
