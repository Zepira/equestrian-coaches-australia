// Static mock of the monthly numbers email (canvas: "The monthly email,
// shown") — every figure is a labelled example, never presented as a real
// coach's data (the "no invented statistics" rule this page is built under).
const STATS = [
  { value: "412", label: "Appeared in search" },
  { value: "38", label: "Profile views" },
  { value: "9", label: "Tapped to call" },
  { value: "4", label: "Enquiries" },
];

export function MonthlyEmailExample() {
  return (
    <div className="overflow-hidden rounded-[16px] border border-border bg-surface shadow-[0_20px_50px_rgba(31,58,46,.1)] wide:shadow-[0_24px_60px_rgba(31,58,46,.12)]">
      <div className="flex items-center justify-between bg-shade px-[18px] py-3 text-[11px] font-medium uppercase tracking-[0.14em] text-subtle wide:px-[22px]">
        <span>Example email</span>
        <span className="font-display text-[14px] normal-case tracking-normal wide:text-[15px]">Equestrian Coaches Australia</span>
      </div>
      <div className="px-[18px] py-[22px] wide:px-[22px] wide:py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">Subject</p>
        <p className="mt-1 font-display text-[24px] leading-[1.1] text-fg wide:text-[26px]">Your August on Equestrian Coaches Australia</p>
        <div className="mt-5 grid grid-cols-2 gap-2 wide:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-[10px] border border-border bg-bg px-2.5 py-3.5 text-center wide:px-2">
              <div className="font-display text-[36px] leading-none text-ink wide:text-[34px]">{s.value}</div>
              <div className="mt-1.5 text-[12px] leading-[1.3] text-muted">{s.label}</div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-[15px] leading-[1.55] text-fg">
          You came up most often for &ldquo;dressage lessons Geelong&rdquo; and &ldquo;flatwork coach Bellarine&rdquo;. Nine riders tapped to see your number, up from five in July <span className="text-subtle">(example figures)</span>.
        </p>
        <p className="mt-2.5 text-[15px] leading-[1.55] text-fg">Two of your four enquiries are still marked as no response.</p>
      </div>
      <div className="border-t border-border bg-shade px-[18px] py-3.5 text-[13.5px] leading-[1.5] text-muted wide:px-[22px] wide:text-[14px]">
        The quiet months get the same email. If nothing happened, it says so, and tells you the two things most likely to change it.
      </div>
    </div>
  );
}
