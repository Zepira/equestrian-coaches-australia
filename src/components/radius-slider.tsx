"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The 25–150 km radius control (canvas: Search Results). Tracks locally
 * while dragging and commits on the native `change` event (pointer release
 * or key up), so the page reloads once per pick rather than per pixel. One
 * instance per layout — the phone and desktop rows each mount their own,
 * so each has its own listener.
 */
export function RadiusSlider({
  value,
  onCommit,
  className = "",
}: {
  value: number;
  onCommit: (km: number) => void;
  className?: string;
}) {
  const [local, setLocal] = useState(value);
  const [fromProps, setFromProps] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  const commitRef = useRef(onCommit);

  // Re-sync when the URL's radius changes (back/forward, another push) —
  // the "adjust state during render" pattern, not a setState in an effect.
  if (value !== fromProps) {
    setFromProps(value);
    setLocal(value);
  }

  useEffect(() => {
    commitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onChange = () => commitRef.current(Number(el.value));
    el.addEventListener("change", onChange);
    return () => el.removeEventListener("change", onChange);
  }, []);

  return (
    <input
      ref={ref}
      type="range"
      min={25}
      max={150}
      step={25}
      value={local}
      onChange={(e) => setLocal(Number(e.target.value))}
      aria-label="Search radius in kilometres"
      data-radius={local}
      className={`w-full accent-accent ${className}`}
      list="radius-steps"
    />
  );
}
