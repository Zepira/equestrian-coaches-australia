/** Shown on login/signup when Supabase auth isn't wired up yet — was identical, hand-duplicated markup in both forms. */
export function AuthNotConfiguredBanner() {
  return (
    <p className="mt-4 rounded-[var(--radius-control)] border border-border bg-accent-soft p-3 text-sm text-fg">
      Auth isn&apos;t connected yet — this form is a preview until Supabase is set up.
    </p>
  );
}
