/**
 * The open/close caret shared by every menu trigger. A drawn chevron rather
 * than the "▾" character: that glyph renders at whatever weight and size the
 * font happens to give it (small and thin in Hanken Grotesk), and it can't
 * carry a stroke weight of its own.
 *
 * `currentColor` and a 1em box, so it inherits the trigger's colour and
 * scales with its text. Rotation is left to the caller.
 */
export function Caret({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m5 9 7 7 7-7" />
    </svg>
  );
}
