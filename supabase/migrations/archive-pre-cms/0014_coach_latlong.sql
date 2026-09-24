-- Same pattern as postcodes (0004) and areas (0013): a plain lat/long pair
-- alongside the geography column. Needed now for coach Person/LocalBusiness
-- structured data (GeoCoordinates) — PostgREST can't apply ST_X/ST_Y to a
-- geography column in a plain select.
alter table public.coach_profiles add column lat double precision;
alter table public.coach_profiles add column long double precision;

update public.coach_profiles set lat = ST_Y(location::geometry), long = ST_X(location::geometry) where location is not null;
