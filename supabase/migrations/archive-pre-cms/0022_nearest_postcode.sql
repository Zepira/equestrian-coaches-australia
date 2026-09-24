-- "Use my location" (17 Sep 2026): the browser gives a lat/long; the search
-- runs on place names, so this turns the point back into the nearest
-- postcode row. KNN on the existing GiST index (0001_init.sql), one row.

create or replace function public.nearest_postcode(
  p_lat  double precision,
  p_long double precision
)
returns table (
  postcode text,
  suburb text,
  state text,
  lat double precision,
  long double precision,
  distance_km double precision
)
language sql
stable
as $$
  -- Nearest handful by KNN, then prefer a real suburb over a delivery-centre
  -- / mail-centre row ("BENDIGO DC") that shares its coordinates.
  with near as (
    select p.postcode, p.suburb, p.state, p.lat, p.long,
           st_distance(p.location, st_setsrid(st_makepoint(p_long, p_lat), 4326)::geography) / 1000 as distance_km
    from public.postcodes p
    where p.lat is not null and p.long is not null
    order by p.location <-> st_setsrid(st_makepoint(p_long, p_lat), 4326)::geography
    limit 12
  )
  select postcode, suburb, state, lat, long, distance_km
  from near
  order by
    floor(distance_km),
    (suburb ~* '\m(DC|MC|BC|LPO|PO BOXES|DELIVERY CENTRE|MAIL CENTRE)\M'),
    length(suburb)
  limit 1;
$$;

grant execute on function public.nearest_postcode to anon, authenticated;
