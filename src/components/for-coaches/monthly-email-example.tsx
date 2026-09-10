// Static mock of the monthly numbers email — every figure here is a
// labelled example, never presented as a real coach's data (see the "no
// invented statistics" rule this page is built under).
const STATS = [
  { value: "412", label: "Appeared in search" },
  { value: "38", label: "Profile views" },
  { value: "9", label: "Tapped to call" },
  { value: "4", label: "Enquiries" },
];

export function MonthlyEmailExample() {
  return (
    <div className="mx-auto max-w-xl overflow-hidden rounded-[var(--radius-tile)] border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-shade px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-subtle">
          Example email
        </span>
        <span className="font-display text-sm text-subtle">Equestrian Coaches Australia</span>
      </div>

      <div className="px-5 py-6 sm:px-8">
        <p className="text-xs uppercase tracking-wide text-subtle">Subject</p>
        <p className="mt-1 font-display text-xl text-fg">Your August on Equestrian Coaches Australia</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-[var(--radius-control)] border border-border bg-bg px-3 py-4 text-center">
              <div className="font-display text-3xl text-ink">{s.value}</div>
              <div className="mt-1 text-xs leading-tight text-muted">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-3 text-[15px] leading-relaxed text-fg">
          <p>
            You came up most often for &ldquo;dressage lessons Geelong&rdquo; and &ldquo;flatwork
            coach Bellarine&rdquo;. Nine riders tapped to see your number, up from five in July
            <span className="text-subtle"> (example figures)</span>.
          </p>
          <p>Two of your four enquiries are still marked as no response.</p>
        </div>
      </div>

      <div className="border-t border-border bg-shade px-5 py-4 sm:px-8">
        <p className="text-sm text-muted">
          The quiet months get the same email. If nothing happened, it says so, and tells you the
          two things most likely to change it.
        </p>
      </div>
    </div>
  );
}
