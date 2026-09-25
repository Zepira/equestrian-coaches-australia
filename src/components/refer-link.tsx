"use client";

import { useState } from "react";
import { absoluteUrl } from "@/lib/site-url";

/**
 * "Know someone good? Send them this link" (The Marketing Engine M3), under
 * a search that found nobody. The person sends it themselves, by text or
 * email: we never email someone because a visitor typed their address in
 * (that would be our message, without their consent).
 */
export function ReferLink({ singular, slug }: { singular: string; slug: string }) {
  const url = absoluteUrl(`/join/${slug}?ref=empty-search`);
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const text = `You should list yourself on Equine Professionals Australia. People near you are looking: ${url}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {}
  };
  return (
    <div className="rounded-[16px] border border-border bg-surface p-5" data-refer-link>
      <p className="text-[15px] font-medium text-fg">Know a good {singular}? Send them this link.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input readOnly value={url} aria-label="Link to send" className="h-11 w-full rounded-[10px] bg-shade px-3 font-mono text-[12.5px] text-fg" />
        <button type="button" onClick={share} className="h-11 shrink-0 rounded-[var(--radius-pill)] border border-border px-5 text-[14px] font-medium text-fg hover:bg-shade">
          {copied ? "Copied" : "Share or copy"}
        </button>
      </div>
    </div>
  );
}
