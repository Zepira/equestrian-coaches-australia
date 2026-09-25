-- The Marketing Engine stage C: M5 rider reviews and the enquiry follow-up.
--
-- Reviews are a separate thing from testimonials (which the professional
-- types in and which say "Provided by the business"). Under the ACCC's
-- guidance for review platforms: every genuine review is published, bad ones
-- too; removal only for a reason in the published policy, logged with who and
-- why; paying for a plan never changes which reviews show or the average;
-- nobody edits review text.
--
-- Every read and write goes through server code with the service role, so the
-- reviewer's email and device hash never reach a browser. RLS below is admin
-- only.

-- ── the enquiry follow-up ("Did you end up booking Jane?") ───────────────
-- The rider's answer sits on the enquiry, where the professional sees it. The
-- link's token does not: professionals can read their own enquiry rows, and
-- whoever holds the token can post an "Enquired through" review. So the token
-- lives in its own table that only the server reads.
alter table public.enquiries add column if not exists rider_outcome text check (rider_outcome in ('booked', 'not_booked', 'still_talking'));
alter table public.enquiries add column if not exists rider_answered_at timestamptz;
alter table public.enquiries drop column if exists followup_token;
alter table public.enquiries drop column if exists followup_sent_at;
create table if not exists public.enquiry_followups (
  enquiry_id uuid primary key references public.enquiries (id) on delete cascade,
  token      text not null unique default encode(gen_random_bytes(18), 'hex'),
  -- Null when there was nothing to send (no email address, bounced, already reviewed).
  sent_at    timestamptz,
  created_at timestamptz not null default now()
);
alter table public.enquiry_followups enable row level security;
drop policy if exists "enquiry followups admin" on public.enquiry_followups;
create policy "enquiry followups admin" on public.enquiry_followups for all using (public.is_admin()) with check (public.is_admin());

-- ── reviews ──────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id                 uuid primary key default gen_random_uuid(),
  provider_id        uuid not null references public.providers (id) on delete cascade,
  profession_id      uuid references public.terms (id) on delete set null,
  rider_id           uuid references public.profiles (id) on delete set null,
  enquiry_id         uuid references public.enquiries (id) on delete set null,
  -- 'enquiry': they enquired through us and said they booked. 'request': the
  -- professional's own link. Only 'enquiry' earns the "Enquired through" tag.
  source             text not null check (source in ('enquiry', 'request')),
  author_name        text not null check (length(author_name) between 1 and 60),
  author_email       text not null,
  rating             smallint not null check (rating between 1 and 5),
  body               text not null check (length(body) between 20 and 3000),
  -- unconfirmed: waiting for the reviewer to press the link in their email.
  -- pending: waiting for a person (or flagged). published. removed.
  status             text not null default 'unconfirmed' check (status in ('unconfirmed', 'pending', 'published', 'removed')),
  -- Why the checks stopped it going straight up: same_device, same_text, own_account.
  flags              text[] not null default '{}',
  removal_reason     text check (removal_reason in ('fake', 'conflict', 'abusive', 'defamatory', 'off_topic', 'personal_info')),
  confirm_token      text unique default encode(gen_random_bytes(18), 'hex'),
  device_hash        text,
  text_hash          text,
  provider_reply     text check (length(provider_reply) <= 1500),
  provider_replied_at timestamptz,
  created_at         timestamptz not null default now(),
  confirmed_at       timestamptz,
  published_at       timestamptz
);
-- One review per person per professional.
create unique index if not exists reviews_one_per_email on public.reviews (provider_id, lower(author_email)) where status <> 'removed';
create index if not exists reviews_provider_published on public.reviews (provider_id, published_at desc) where status = 'published';
create index if not exists reviews_status on public.reviews (status, created_at);
create index if not exists reviews_text_hash on public.reviews (text_hash);
create index if not exists reviews_device_hash on public.reviews (device_hash);
alter table public.reviews enable row level security;
drop policy if exists "reviews admin" on public.reviews;
create policy "reviews admin" on public.reviews for all using (public.is_admin()) with check (public.is_admin());

-- Every moderation decision, kept.
create table if not exists public.review_moderation_log (
  id         uuid primary key default gen_random_uuid(),
  review_id  uuid not null references public.reviews (id) on delete cascade,
  action     text not null check (action in ('publish', 'remove', 'restore', 'report_dismissed', 'report_upheld')),
  reason     text,
  note       text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists review_moderation_log_review on public.review_moderation_log (review_id, created_at desc);
alter table public.review_moderation_log enable row level security;
drop policy if exists "review log admin" on public.review_moderation_log;
create policy "review log admin" on public.review_moderation_log for all using (public.is_admin()) with check (public.is_admin());

-- "Report this review", from anyone.
create table if not exists public.review_reports (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null references public.reviews (id) on delete cascade,
  reason      text not null check (reason in ('fake', 'conflict', 'abusive', 'defamatory', 'off_topic', 'personal_info', 'other')),
  detail      text check (length(detail) <= 1000),
  reporter_email text,
  device_hash text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null
);
create index if not exists review_reports_open on public.review_reports (created_at) where resolved_at is null;
alter table public.review_reports enable row level security;
drop policy if exists "review reports admin" on public.review_reports;
create policy "review reports admin" on public.review_reports for all using (public.is_admin()) with check (public.is_admin());

-- The review pages sit at the top level, so no profession may take their words.
alter table public.terms drop constraint if exists terms_profession_slug_not_reserved;
alter table public.terms add constraint terms_profession_slug_not_reserved check (
  kind <> 'profession' or slug not in (
    'about', 'account', 'admin', 'api', 'auth', 'clinics', 'dashboard', 'disciplines', 'events',
    'for-coaches', 'for-professionals', 'forgot-password', 'horse-care', 'icon.png', 'apple-icon.png', 'join',
    'list-your-business', 'login', 'profile', 'reset-password', 'riding-instructors', 'robots.txt', 'search',
    'signup', 'sitemap.xml', 'brand', 'hero', 'vendor', '_next', 'onboarding', 'unsubscribe', 'terms', 'privacy',
    'go', 'p', 'email-preferences', 'alerts', 'how-we-list', 'guides', 'review', 'reviews', 'review-policy', 'enquiry'
  )
);
