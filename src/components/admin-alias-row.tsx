export type Alias = {
  id: string;
  alias: string;
  source: string;
  is_primary: boolean;
  terms: { name: string; kind: string } | null;
};

/** One row of `/admin/aliases` — the matched term, its source, and a remove action. */
export function AdminAliasRow({
  alias,
  onRemove,
}: {
  alias: Alias;
  onRemove: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-tile)] border border-border bg-surface px-3 py-2 text-sm">
      <div className="min-w-0">
        <span className="font-medium text-fg">{alias.alias}</span>
        <span className="text-muted"> → {alias.terms?.name ?? "—"}</span>
        {alias.is_primary && (
          <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-fg">primary</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-xs uppercase tracking-wide text-muted">{alias.source}</span>
        <form action={onRemove}>
          <button type="submit" className="text-sm text-danger">
            Remove
          </button>
        </form>
      </div>
    </div>
  );
}
