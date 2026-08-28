-- Plain lat/long columns alongside `location` — PostgREST returns
-- `geography` as an opaque WKB string by default, which is awkward to
-- parse client-side. Simpler to just carry the floats too; `location`
-- stays authoritative for the PostGIS distance calc in nearby_coaches().
alter table public.postcodes
  add column if not exists lat double precision,
  add column if not exists long double precision;

update public.postcodes
set lat = st_y(location::geometry), long = st_x(location::geometry)
where lat is null;

alter table public.postcodes
  alter column lat set not null,
  alter column long set not null;
