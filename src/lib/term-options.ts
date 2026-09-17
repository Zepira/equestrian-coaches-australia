/**
 * The shape every dropdown option carries: the slug it submits, the name it
 * shows, and the search aliases it also answers to (from `term_aliases`), so
 * typing "xc" in a menu surfaces Eventing. Built once here so the pages, the
 * /api/terms route and the menus never drift on what an option is.
 */
export type TermOption = { slug: string; name: string; aliases?: string[] };

export function toTermOption(t: { slug: string; name: string; aliases?: string[] | null }): TermOption {
  return { slug: t.slug, name: t.name, aliases: t.aliases?.length ? t.aliases : undefined };
}
