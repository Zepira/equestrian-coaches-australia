-- Coach-chosen contact channels. A coach may not want email enquiries at
-- all (or any single channel) — each channel has its own value + a
-- separate "show it on my public profile" toggle, so a coach can fill in a
-- phone number for their own records without publishing it. The in-app
-- contact form is opt-out (defaults on) rather than opt-in, so a coach who
-- saves without touching this section still has at least one working
-- enquiry path on their page.
alter table public.coach_profiles
  add column contact_email text not null default '',
  add column contact_phone text not null default '',
  add column facebook_url text not null default '',
  add column show_contact_email boolean not null default false,
  add column show_contact_phone boolean not null default false,
  add column show_facebook boolean not null default false,
  add column show_contact_form boolean not null default true;
