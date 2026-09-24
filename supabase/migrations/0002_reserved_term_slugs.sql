-- CMS build stage 3: /[profession]/[term] and /[profession]/in/[area] share
-- the second segment, so no discipline or speciality may be called "in".
-- Mirrors RESERVED_TERM_SLUGS in src/lib/reserved-slugs.ts.
alter table public.terms
  add constraint terms_term_slug_not_reserved check (kind = 'profession' or lower(slug) <> 'in');
