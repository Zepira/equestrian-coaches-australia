export type Term = {
  id: string;
  kind: "discipline" | "skill" | "attribute";
  slug: string;
  name: string;
  generates_pages: boolean;
  active: boolean;
};

/** One row of `/admin/terms` — rename, change-slug, pages-toggle and active-toggle for a single term. */
export function AdminTermRow({
  term,
  onRename,
  onChangeSlug,
  onToggleGeneratesPages,
  onToggleActive,
}: {
  term: Term;
  onRename: (formData: FormData) => void | Promise<void>;
  onChangeSlug: (formData: FormData) => void | Promise<void>;
  onToggleGeneratesPages: (formData: FormData) => void | Promise<void>;
  onToggleActive: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-[var(--radius-tile)] border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between ${
        !term.active ? "opacity-50" : ""
      }`}
    >
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <form action={onRename} className="flex items-center gap-2">
          <input
            name="name"
            defaultValue={term.name}
            className="w-full rounded-[var(--radius-control)] border border-border bg-bg px-2 py-1.5 text-sm text-fg sm:max-w-xs"
          />
          <button type="submit" className="shrink-0 text-sm font-medium text-accent">
            Save
          </button>
        </form>
        {/* The slug trap's deliberate escape hatch — changing this writes
            term_slug_history so the old URL 301s (see
            src/lib/supabase/middleware.ts), it never just breaks. */}
        <form action={onChangeSlug} className="flex items-center gap-1 text-xs text-muted">
          <span>/</span>
          <input
            name="slug"
            defaultValue={term.slug}
            className="w-32 rounded-[var(--radius-control)] border border-border bg-bg px-2 py-1 text-xs text-fg"
          />
          <button type="submit" className="shrink-0 font-medium text-danger" title="Old URL will 301 here">
            Change slug
          </button>
        </form>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-sm">
        {term.kind === "discipline" ? (
          <span className="text-muted">
            pages: <strong className="text-fg">{term.generates_pages ? "on" : "off"}</strong>
          </span>
        ) : (
          <form action={onToggleGeneratesPages}>
            <button type="submit" className="text-muted hover:text-fg">
              pages: {term.generates_pages ? "on" : "off"}
            </button>
          </form>
        )}
        <form action={onToggleActive}>
          <button type="submit" className={term.active ? "text-danger" : "text-accent"}>
            {term.active ? "Deactivate" : "Reactivate"}
          </button>
        </form>
      </div>
    </div>
  );
}
