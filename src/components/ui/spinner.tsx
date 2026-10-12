"use client";

import { useFormStatus } from "react-dom";

/**
 * A small ring that spins in the current text colour, for anything that's
 * working: a button waiting on its form, a page on its way. With reduced
 * motion it pulses instead of spinning, so it still says "busy".
 */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`spinner inline-block size-[1em] shrink-0 rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}

/**
 * Drop inside a plain `<button type="submit">` in a form with a server
 * action: shows a spinner while that form is sending, nothing otherwise.
 * The shared Button does this by itself.
 */
export function PendingSpinner({ className = "mr-2 align-[-0.125em]" }: { className?: string }) {
  const { pending } = useFormStatus();
  return pending ? <Spinner className={className} /> : null;
}
