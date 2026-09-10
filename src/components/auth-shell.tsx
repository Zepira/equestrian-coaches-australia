import type { ReactNode } from "react";

/**
 * Frame for the auth pages (login, signup, forgot / reset password) — no
 * canvas exists for them, so they borrow the rider account's page head:
 * uppercase eyebrow, Instrument Serif display heading, one-line lead, then
 * the form in a cream card.
 */
export function AuthShell({ eyebrow, title, lead, children, footer }: { eyebrow: string; title: ReactNode; lead?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="fade-in mx-auto max-w-[440px] px-[18px] pt-8 pb-14 wide:pt-14 wide:pb-20">
      <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-subtle">{eyebrow}</p>
      <h1 className="mt-1.5 font-display text-[40px] leading-none -tracking-[0.02em] text-ink wide:mt-2 wide:text-[48px] wide:leading-[0.98]">{title}</h1>
      {lead && <p className="mt-2.5 text-[15px] leading-[1.5] text-muted">{lead}</p>}
      <div className="mt-6 rounded-[18px] border border-border bg-surface p-4 wide:p-6">{children}</div>
      {footer && <p className="mt-5 text-center text-[14px] text-muted">{footer}</p>}
    </div>
  );
}
