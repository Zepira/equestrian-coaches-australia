"use client";

import { useState, useTransition } from "react";
import { cycleEnquiryStatus, type EnquiryStatus } from "./actions";

export const STATUS_LABEL: Record<EnquiryStatus, string> = {
  new: "New",
  replied: "Replied",
  booked: "Booked",
  no_response: "No response",
};
const STYLE: Record<EnquiryStatus, string> = {
  new: "text-accent bg-accent/10",
  replied: "text-ink bg-[#e6efe8]",
  booked: "text-ink-fg bg-ink",
  no_response: "text-subtle bg-shade",
};

/** Read-only pill (overview) or the tappable cycling button (inbox). */
export function StatusPill({ status, className = "" }: { status: EnquiryStatus; className?: string }) {
  return (
    <span className={`whitespace-nowrap rounded-[var(--radius-pill)] px-[9px] py-[5px] text-[11px] font-medium uppercase tracking-[0.08em] ${STYLE[status]} ${className}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function EnquiryStatusButton({ id, status: initial }: { id: string; status: EnquiryStatus }) {
  const [status, setStatus] = useState<EnquiryStatus>(initial);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await cycleEnquiryStatus(id, status);
          setStatus(r.status);
        })
      }
      data-status={status}
      aria-label={`Status: ${STATUS_LABEL[status]}. Tap to change.`}
      className={`whitespace-nowrap rounded-[var(--radius-pill)] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] transition-colors duration-200 disabled:opacity-60 ${STYLE[status]}`}
    >
      {STATUS_LABEL[status]} ↻
    </button>
  );
}
