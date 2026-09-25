-- Stage 9 of the CMS rebuild: before launch.
-- /terms and /privacy are new top-level routes, so no profession may take
-- their slugs. Mirrors RESERVED_SLUGS in src/lib/reserved-slugs.ts.
alter table public.terms drop constraint if exists terms_profession_slug_not_reserved;
alter table public.terms add constraint terms_profession_slug_not_reserved check (
  kind <> 'profession' or slug not in (
    'about', 'account', 'admin', 'api', 'auth', 'clinics', 'dashboard', 'disciplines', 'events',
    'for-coaches', 'for-professionals', 'forgot-password', 'horse-care', 'icon.png', 'apple-icon.png', 'join',
    'list-your-business', 'login', 'profile', 'reset-password', 'riding-instructors', 'robots.txt', 'search',
    'signup', 'sitemap.xml', 'brand', 'hero', 'vendor', '_next', 'onboarding', 'unsubscribe', 'terms', 'privacy'
  )
);
