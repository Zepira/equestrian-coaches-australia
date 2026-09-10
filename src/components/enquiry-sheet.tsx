"use client";

import { useEffect, useRef, useState } from "react";
import { ContactForm } from "@/components/contact-form";

/**
 * Phones (canvas: Coach Profile mobile): a sticky bar at the bottom —
 * "Enquire with Isabella · Free · no account needed" — that opens a bottom
 * sheet (`sheet .45s`) over a scrim (`fade .3s`) holding the enquiry form.
 * Scrim click, Close and Escape dismiss it; body scroll is locked while
 * open; focus moves into the sheet and back to the bar on close.
 */
export function EnquirySheet({
  coachId,
  coachName,
  firstName,
  takingStudents,
}: {
  coachId: string | null;
  coachName: string;
  firstName: string;
  takingStudents: "yes" | "waitlist" | "no";
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!open) return;
    const bar = trigger.current;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    heading.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      bar?.focus();
    };
  }, [open]);

  const closed = takingStudents === "no" || !coachId;

  return (
    <>
      <div className="enquiry-bar wide:hidden">
        <button
          ref={trigger}
          type="button"
          disabled={closed}
          onClick={() => setOpen(true)}
          className="flex h-14 w-full items-center justify-between rounded-[var(--radius-pill)] bg-accent px-[22px] text-[16px] font-semibold text-accent-fg shadow-[0_16px_40px_rgba(180,85,58,.35)] transition-colors duration-[250ms] hover:bg-accent-hover disabled:bg-shade disabled:text-subtle disabled:shadow-none"
        >
          <span>{closed ? "Not taking students right now" : `Enquire with ${firstName}`}</span>
          {!closed && <span className="text-[14px] font-normal opacity-85">Free · no account needed</span>}
        </button>
      </div>

      {open && coachId && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end wide:hidden" role="presentation">
          <div className="fade-in absolute inset-0 bg-ink-deep/55" style={{ animationDuration: "0.3s" }} onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="enquiry-sheet-title"
            className="relative rounded-t-[22px] bg-surface px-[18px] pb-[calc(22px+var(--safe-bottom))] pt-3.5 shadow-[0_-20px_60px_rgba(20,40,31,.3)]"
            style={{ animation: "sheet 0.45s cubic-bezier(.16,1,.3,1) both" }}
          >
            <div aria-hidden className="mx-auto mb-3.5 h-1 w-10 rounded-[2px] bg-border" />
            <div className="flex items-baseline justify-between">
              <h2 id="enquiry-sheet-title" ref={heading} tabIndex={-1} className="font-display text-[28px] leading-none text-ink outline-none">
                Message {firstName}
              </h2>
              <button type="button" onClick={() => setOpen(false)} className="text-[14px] font-medium text-subtle">
                Close
              </button>
            </div>
            <div className="mt-4">
              <ContactForm coachId={coachId} coachName={coachName} firstName={firstName} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
