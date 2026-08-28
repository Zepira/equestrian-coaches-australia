-- Plain lat/long columns on areas, same pattern as postcodes
-- (0004_postcodes_latlong.sql) — the new /riding-instructors/[area] and
-- /disciplines/[slug]/[area] routes need a centre point to pass straight
-- into searchCoaches()/nearby_coaches(), and PostgREST can't apply
-- ST_X/ST_Y to a geography column in a plain select.
alter table public.areas add column lat double precision;
alter table public.areas add column long double precision;

update public.areas set lat = ST_Y(centroid::geometry), long = ST_X(centroid::geometry);
