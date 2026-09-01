export type Term = { id: string; slug: string; name: string; blurb?: string };

/**
 * A labelled fieldset of pill-styled checkboxes for one taxonomy kind
 * (discipline/skill/attribute). Used by the coach profile editor's
 * skills/attributes sections and the rider account page's "notify me"
 * discipline preferences — was previously duplicated between the two
 * (profile-form.tsx had the only copy; account/page.tsx hand-rolled an
 * inline fieldset reproducing the same markup).
 */
export function TermCheckboxGroup({
  legend,
  hint,
  name,
  terms,
  selectedIds,
  configured,
}: {
  legend: string;
  hint?: string;
  name: string;
  terms: Term[];
  selectedIds: string[];
  configured: boolean;
}) {
  return (
    <fieldset disabled={!configured}>
      <legend className="mb-1 text-sm font-medium text-fg">{legend}</legend>
      {hint && <p className="mb-2 text-sm text-muted">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {terms.map((t) => (
          <label
            key={t.id}
            className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-fg has-checked:border-accent has-checked:bg-accent-soft"
          >
            <input
              type="checkbox"
              name={name}
              value={t.id}
              defaultChecked={selectedIds.includes(t.id)}
              className="accent-current"
            />
            {t.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
