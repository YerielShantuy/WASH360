-- Update get_bingo_zones_nearby to also return distance_meters so the client
-- can display distance and determine in-range status without a second query.
-- PostGIS ST_Distance on GEOGRAPHY returns metres; 0 means user is inside the polygon.

DROP FUNCTION IF EXISTS get_bingo_zones_nearby(FLOAT, FLOAT, FLOAT);

CREATE OR REPLACE FUNCTION get_bingo_zones_nearby(
  lat FLOAT, lng FLOAT, radius_meters FLOAT DEFAULT 500
)
RETURNS TABLE(
  id        UUID,
  name      TEXT,
  active    BOOLEAN,
  distance_meters FLOAT8
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    bz.id,
    bz.name,
    bz.active,
    ST_Distance(bz.polygon, ST_MakePoint(lng, lat)::GEOGRAPHY) AS distance_meters
  FROM bingo_zones bz
  WHERE bz.active = TRUE
    AND ST_DWithin(
      bz.polygon,
      ST_MakePoint(lng, lat)::GEOGRAPHY,
      radius_meters
    )
  ORDER BY distance_meters ASC;
$$;
