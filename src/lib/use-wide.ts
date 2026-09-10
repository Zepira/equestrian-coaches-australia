"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 1100px)"; // the canvases' phone/desktop switch — `wide:` in Tailwind

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/**
 * True from 1100px up. `false` on the server and for the first client
 * render (so SSR and hydration agree), then the real value. Use it to
 * avoid mounting heavy client-only widgets — the results map — inside a
 * layout that CSS is hiding at this width anyway.
 */
export function useWide() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
