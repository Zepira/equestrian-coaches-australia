-- Enquiry retention (The Site as a CMS §04: "enquiry contact details deleted
-- after 24 months"). The row stays, so a professional's counts and outcomes
-- don't change; the person goes: their name, how to reach them, what they
-- wrote, and the link to their account. The months are the
-- enquiry_retention_months setting; /api/cron/retention runs this daily.
alter table public.enquiries add column if not exists redacted_at timestamptz;

create or replace function public.redact_old_enquiries(p_months integer)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_count integer;
begin
  if p_months is null or p_months < 12 then
    raise exception 'retention must be at least 12 months';
  end if;
  delete from enquiry_followups f
  using enquiries e
  where f.enquiry_id = e.id and e.redacted_at is null and e.created_at < now() - make_interval(months => p_months);
  update enquiries
     set rider_name = '', rider_contact = '', message = '', rider_id = null, redacted_at = now()
   where redacted_at is null and created_at < now() - make_interval(months => p_months);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.redact_old_enquiries(integer) from public, anon, authenticated;
