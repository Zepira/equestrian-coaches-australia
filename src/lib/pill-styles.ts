/**
 * The active/inactive color classes shared by every toggleable pill in the
 * app (discipline tags, quick-filter attribute pills, the PillDropdown
 * trigger button) — each call site keeps its own padding/sizing/shape
 * classes, only the color logic was duplicated.
 */
export function pillToggleClassName(active: boolean): string {
  return active
    ? "border-accent bg-accent text-accent-fg"
    : "border-border bg-surface text-fg hover:border-accent";
}
