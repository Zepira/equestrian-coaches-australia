"use client";

import { useState } from "react";

/** A read-only box with a Copy button: links, snippets, messages to send. */
export function CopyField({ value, label, multiline = false }: { value: string; label: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  const box = "w-full rounded-[10px] bg-shade px-3 py-2 font-mono text-[12.5px] leading-[1.5] text-fg";
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
      {multiline ? <textarea readOnly value={value} aria-label={label} rows={Math.min(8, value.split("\n").length + 1)} className={box} /> : <input readOnly value={value} aria-label={label} className={`${box} h-10`} />}
      <button type="button" onClick={copy} className="h-10 shrink-0 rounded-[var(--radius-pill)] border border-border px-4 text-[14px] font-medium text-fg hover:bg-shade">
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
