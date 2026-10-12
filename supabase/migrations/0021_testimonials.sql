-- Testimonial tools (12 Oct 2026; Trello "Testimonial collection tools").
-- Testimonials are the professional's own choice of quotes, labelled
-- "Provided by the business" and never part of the rating: rider reviews
-- (0012_reviews.sql) are the independent ones. What this adds:
--   * a town beside the name, an order, and one pinned quote per provider;
--   * a request link (/testimonial/<slug>) a client writes through: those
--     arrive 'pending' with the time they ticked consent, and the
--     professional shows or declines them; their words can't be edited
--     (src/lib/testimonials.ts and the trigger below);
--   * length limits, so a quote stays a quote.
-- Only shown testimonials are public.

alter table public.testimonials
  add column if not exists author_place text not null default '',
  add column if not exists sort_order   integer not null default 0,
  add column if not exists pinned       boolean not null default false,
  add column if not exists status       text not null default 'shown',
  add column if not exists source       text not null default 'added',
  add column if not exists consent_at   timestamptz,
  add column if not exists device_hash  text,
  add column if not exists updated_at   timestamptz not null default now();

alter table public.testimonials
  add constraint testimonials_status_check check (status in ('pending', 'shown', 'declined')),
  add constraint testimonials_source_check check (source in ('added', 'request')),
  add constraint testimonials_author_len check (char_length(author_name) between 1 and 80),
  add constraint testimonials_place_len check (char_length(author_place) <= 60),
  add constraint testimonials_quote_len check (char_length(quote) between 1 and 800),
  add constraint testimonials_request_consent check (source <> 'request' or consent_at is not null);

-- One pinned quote per provider.
create unique index if not exists testimonials_one_pin on public.testimonials (provider_id) where pinned;
create index if not exists testimonials_provider_order on public.testimonials (provider_id, status, pinned desc, sort_order, created_at desc);

-- Existing rows were typed in by the professional and are showing; give
-- them an order matching what the dashboard showed (newest first).
update public.testimonials t set sort_order = x.n
from (select id, row_number() over (partition by provider_id order by created_at desc) - 1 as n from public.testimonials) x
where x.id = t.id;

-- A client's own words stay theirs: the professional can show, hide, order
-- or pin a requested testimonial, not rewrite it.
create or replace function public.testimonials_keep_client_words()
returns trigger language plpgsql as $$
begin
  if old.source = 'request' and (new.quote is distinct from old.quote or new.author_name is distinct from old.author_name or new.author_place is distinct from old.author_place) then
    raise exception 'A testimonial a client wrote can be shown or hidden, not edited.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists testimonials_keep_client_words on public.testimonials;
create trigger testimonials_keep_client_words before update on public.testimonials
  for each row execute function public.testimonials_keep_client_words();

-- The public sees shown testimonials only; members see and manage all of
-- theirs (the existing "members manage testimonials" policy).
drop policy if exists "testimonials readable" on public.testimonials;
create policy "testimonials readable" on public.testimonials for select using (status = 'shown' or public.is_provider_member(provider_id));
