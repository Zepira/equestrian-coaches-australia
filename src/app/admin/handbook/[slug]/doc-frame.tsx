"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The document renders in an iframe rather than inline.
 *
 * Each handbook document carries its own complete stylesheet, written for a
 * full-bleed reading page — it sets rules on `body`, defines its own custom
 * properties and uses generous class names like `.note` and `.band`. Dropped
 * into the app it would fight Tailwind in both directions. An iframe gives it
 * the whole document it was written for, and guarantees that editing a document
 * can never break the admin panel around it.
 *
 * The cost is height: an iframe does not size to its content. The page inside
 * posts its height on load, on resize and once webfonts settle, and we grow to
 * match, so the outer page scrolls normally with no inner scrollbar.
 */
export function DocFrame({ src, title }: { src: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(900);
  const [ready, setReady] = useState(false);

  /**
   * Ask the document to report its height.
   *
   * The iframe is in the server-rendered HTML, so the browser starts loading it
   * during parse while this listener only attaches after hydration. On a warm
   * cache the document can finish first and fire every height message before
   * anything is listening — which used to leave a blank, invisible box that only
   * a reload could fix. Pinging on load closes that race.
   */
  const ping = useCallback(() => {
    ref.current?.contentWindow?.postMessage(
      { source: "eca-handbook-parent" },
      window.location.origin
    );
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== ref.current?.contentWindow) return;

      const data = event.data as { source?: string; height?: number } | null;
      if (!data || data.source !== "eca-handbook") return;
      if (typeof data.height !== "number" || !Number.isFinite(data.height)) return;

      // Round up to a whole pixel and add a couple back — a fractional height is
      // what produces a permanent 1px inner scrollbar.
      setHeight(Math.max(240, Math.ceil(data.height) + 2));
      setReady(true);
    }

    window.addEventListener("message", onMessage);
    // The frame may already have loaded before this effect ran.
    ping();
    return () => window.removeEventListener("message", onMessage);
  }, [ping]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-shade">
      <iframe
        ref={ref}
        src={src}
        title={title}
        className="block w-full"
        style={{ height, opacity: ready ? 1 : 0, transition: "opacity 150ms ease" }}
        onLoad={() => {
          // A floor, so the frame is never invisible. If the document is not one
          // of ours — an expired session returns a plain-text 404 — no height
          // message will ever arrive, and without this the failure and the
          // loading state look identical.
          setReady(true);
          ping();
        }}
      />
    </div>
  );
}
