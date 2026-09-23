"use client";

import { useState, useSyncExternalStore } from "react";
import { canGeolocate, locateMe, type Located } from "@/lib/geolocate";

/**
 * "Use my location" — the crosshair inside the search card's location
 * field. Asks the browser for a position, turns it into the nearest suburb
 * (/api/reverse-locate) and hands "Suburb STATE" back to the field, so the
 * rest of the search (suggestions, count, results, the map's origin) works
 * exactly as if it had been typed. Hidden where the browser has no
 * geolocation at all; an error shows as a short line under the button and
 * clears on the next attempt.
 */
const subscribeNever = () => () => {};

export function LocateButton({ onLocated, className = "" }: { onLocated: (loc: Located) => void; className?: string }) {
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  // The server can't know whether the browser has geolocation, so the
  // button always renders and only hides after mount when it can't work —
  // an SSR/client difference here is a hydration mismatch.
  const supported = useSyncExternalStore(subscribeNever, canGeolocate, () => true);
  if (!supported) return null;

  async function go() {
    setState("busy");
    setMessage(null);
    try {
      onLocated(await locateMe());
      setState("idle");
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Couldn't get your location.");
    }
  }

  return (
    <span className={`relative flex shrink-0 items-center ${className}`}>
      <button
        type="button"
        onClick={go}
        disabled={state === "busy"}
        aria-label="Use my current location"
        title="Use my current location"
        data-state={state}
        className="locate-btn grid h-8 w-8 place-items-center rounded-[var(--radius-pill)] text-subtle transition-colors duration-200 hover:bg-shade hover:text-accent disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="3.2" />
          <circle cx="12" cy="12" r="7.5" />
          <path d="M12 1.8v3M12 19.2v3M1.8 12h3M19.2 12h3" />
        </svg>
      </button>
      {message && (
        <span role="alert" className="absolute right-0 top-full z-20 mt-1.5 w-[min(280px,80vw)] rounded-[10px] border border-border bg-surface px-3 py-2 text-[12.5px] leading-[1.4] text-fg shadow-[0_12px_30px_rgba(31,58,46,.15)]">
          {message}
        </span>
      )}
    </span>
  );
}
