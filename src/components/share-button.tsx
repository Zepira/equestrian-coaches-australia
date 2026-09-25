"use client";

import { useState } from "react";
import { absoluteUrl } from "@/lib/site-url";

/**
 * Share a profile or an event (The Marketing Engine M6: riders refer by
 * sharing). A signed-in rider's link carries their own ref, so a visit it
 * brings is counted as theirs. No rewards: riders pay nothing.
 */
export function ShareButton({ path, title, className = "" }: { path: string; title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    let ref = "";
    try {
      const r = await fetch("/api/me/ref");
      if (r.ok) ref = ((await r.json()) as { ref?: string }).ref ?? "";
    } catch {}
    const url = absoluteUrl(`${path}${ref ? `?ref=${ref}` : ""}`);
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {}
  };
  return (
    <button type="button" onClick={share} className={`font-medium text-subtle underline-offset-2 hover:text-fg hover:underline ${className}`} data-share>
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
