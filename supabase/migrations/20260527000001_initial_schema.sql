-- ============================================================
-- WASH360 — Initial Schema Migration
-- ============================================================
-- Run order: extensions → types → tables → indexes → RLS → functions

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";     -- for geo queries on modules/zones/reports


-- ============================================================
-- Custom Types (enums)
-- ============================================================
CREATE TYPE user_role        AS ENUM ('user', 'venue_owner', 'council', 'admin');
CREATE TYPE session_type     AS ENUM ('module', 'streak');
CREATE TYPE module_status    AS ENUM ('online', 'offline', 'maintenance');
CREATE TYPE bingo_sub_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE event_status     AS ENUM ('pending', 'approved', 'cancelled');
CREATE TYPE report_type      AS ENUM ('flood', 'clogged_drain');
CREATE TYPE report_status    AS ENUM ('pending', 'acknowledged', 'resolved');
CREATE TYPE report_severity  AS ENUM ('low', 'medium', 'high');
CREATE TYPE friendship_status AS ENUM ('pending', 'accepted');
CREATE TYPE points_source    AS ENUM ('handwash', 'bingo', 'event', 'water_test', 'report');


-- ============================================================
-- Core: profiles
-- ============================================================
CREATE TABLE profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username         TEXT NOT NULL UNIQUE,
  avatar_url       TEXT,
  total_points     INTEGER NOT NULL DEFAULT 0,
  streak_count     INTEGER NOT NULL DEFAULT 0,
  streak_last_date DATE,
  level            INTEGER NOT NULL DEFAULT 1,
  role             user_role NOT NULL DEFAULT 'user',
  region           TEXT,                          -- suburb/city for local leaderboard
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- Modules
-- ============================================================
CREATE TABLE modules (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location     GEOGRAPHY(POINT, 4326) NOT NULL,   -- PostGIS point
  venue_name   TEXT NOT NULL,
  venue_type   TEXT NOT NULL,                      -- 'restaurant','school','office', etc.
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status       module_status NOT NULL DEFAULT 'online',
  last_tap_at  TIMESTAMPTZ
);

CREATE TABLE module_owners (
  module_id  UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (module_id, user_id)
);


-- ============================================================
-- Friendships
-- ============================================================
CREATE TABLE friendships (
  user_a     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status     friendship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a < user_b)   -- canonical ordering prevents duplicate pairs
);


-- ============================================================
-- Badges
-- ============================================================
CREATE TABLE badges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon_url    TEXT,
  condition   JSONB NOT NULL DEFAULT '{}'   -- e.g. {"source":"handwash","threshold":10}
);

CREATE TABLE user_badges (
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id  UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);


-- ============================================================
-- Handwash sessions
-- ============================================================
CREATE TABLE handwash_sessions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id        UUID REFERENCES modules(id) ON DELETE SET NULL,
  technique_score  INTEGER NOT NULL CHECK (technique_score BETWEEN 0 AND 100),
  coverage_score   INTEGER CHECK (coverage_score BETWEEN 0 AND 100),   -- NULL for streak-only
  total_points     INTEGER NOT NULL DEFAULT 0,
  session_type     session_type NOT NULL,
  duration_seconds INTEGER NOT NULL,
  cooldown_active  BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE = session recorded but no points
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- Water quality
-- ============================================================
CREATE TABLE water_quality_tests (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id        UUID REFERENCES modules(id) ON DELETE SET NULL,
  location         GEOGRAPHY(POINT, 4326) NOT NULL,
  location_public  GEOGRAPHY(POINT, 4326) NOT NULL,  -- coarsened ~500m for public map
  ph               NUMERIC(4,2),
  nitrates         NUMERIC(6,2),
  hardness         NUMERIC(6,2),
  turbidity        NUMERIC(6,2),
  quality_score    INTEGER NOT NULL CHECK (quality_score BETWEEN 0 AND 100),
  photo_path       TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per module — tracks when water quality was last tested at that location.
-- Checked before prompting the next non-cooldown user at the module.
CREATE TABLE water_quality_checks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id       UUID NOT NULL UNIQUE REFERENCES modules(id) ON DELETE CASCADE,
  location        GEOGRAPHY(POINT, 4326) NOT NULL,
  last_checked_at TIMESTAMPTZ NOT NULL,
  last_checked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  quality_score   INTEGER NOT NULL CHECK (quality_score BETWEEN 0 AND 100)
);


-- ============================================================
-- Trash Bingo
-- ============================================================
CREATE TABLE bingo_zones (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  polygon    GEOGRAPHY(POLYGON, 4326) NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bingo_cards (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  zone_id                 UUID NOT NULL REFERENCES bingo_zones(id) ON DELETE CASCADE,
  started_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at            TIMESTAMPTZ,
  cells                   JSONB NOT NULL DEFAULT '[]',
  -- cells schema: [{category, status, photo_path, points, item_count}]
  extra_submissions_count INTEGER NOT NULL DEFAULT 0 CHECK (extra_submissions_count <= 5)
);

CREATE TABLE bingo_submissions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id       UUID NOT NULL REFERENCES bingo_cards(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category      TEXT NOT NULL,
  photo_path    TEXT NOT NULL,
  photo_hash    TEXT NOT NULL,               -- SHA-256 for duplicate detection
  ml_confidence NUMERIC(4,3) NOT NULL,       -- 0.000 – 1.000
  item_count    INTEGER NOT NULL DEFAULT 1,  -- multiple items detected = >1
  is_extra      BOOLEAN NOT NULL DEFAULT FALSE,
  status        bingo_sub_status NOT NULL DEFAULT 'pending',
  points_awarded INTEGER NOT NULL DEFAULT 0,
  location      GEOGRAPHY(POINT, 4326) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at     TIMESTAMPTZ                  -- NULL = submitted offline, not yet server-synced
);


-- ============================================================
-- Cleanup Events
-- ============================================================
CREATE TABLE cleanup_events (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            TEXT NOT NULL,
  org_name         TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  event_date       TIMESTAMPTZ NOT NULL,
  location         GEOGRAPHY(POINT, 4326) NOT NULL,
  max_participants INTEGER,
  created_by       UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  status           event_status NOT NULL DEFAULT 'pending',
  banner_url       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE event_participants (
  event_id  UUID NOT NULL REFERENCES cleanup_events(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);


-- ============================================================
-- Drain & Flood Reports
-- ============================================================
CREATE TABLE drain_reports (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  report_type report_type NOT NULL,
  severity    report_severity NOT NULL,
  description TEXT,
  photo_path  TEXT NOT NULL,
  location    GEOGRAPHY(POINT, 4326) NOT NULL,
  status      report_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- Points ledger (append-only, never UPDATE)
-- ============================================================
CREATE TABLE points_transactions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount       INTEGER NOT NULL,   -- positive = earned, negative = redeemed (future)
  source       points_source NOT NULL,
  reference_id UUID NOT NULL,      -- FK to the triggering record (session/submission/etc.)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_modules_location           ON modules USING GIST(location);
CREATE INDEX idx_bingo_zones_polygon        ON bingo_zones USING GIST(polygon);
CREATE INDEX idx_water_tests_location       ON water_quality_tests USING GIST(location);
CREATE INDEX idx_drain_reports_location     ON drain_reports USING GIST(location);
CREATE INDEX idx_cleanup_events_location    ON cleanup_events USING GIST(location);
CREATE INDEX idx_handwash_user_module       ON handwash_sessions(user_id, module_id, created_at DESC);
CREATE INDEX idx_points_user               ON points_transactions(user_id, created_at DESC);
CREATE INDEX idx_profiles_total_points     ON profiles(total_points DESC);
CREATE INDEX idx_bingo_submissions_hash    ON bingo_submissions(photo_hash, created_at DESC);
CREATE INDEX idx_bingo_cards_user_zone     ON bingo_cards(user_id, zone_id) WHERE completed_at IS NULL;


-- ============================================================
-- Utility Functions
-- ============================================================

-- Returns modules within radius_meters of a lat/lng point
CREATE OR REPLACE FUNCTION get_modules_nearby(
  lat FLOAT, lng FLOAT, radius_meters FLOAT DEFAULT 5000
)
RETURNS SETOF modules
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT *
  FROM modules
  WHERE ST_DWithin(
    location,
    ST_MakePoint(lng, lat)::GEOGRAPHY,
    radius_meters
  )
  ORDER BY location <-> ST_MakePoint(lng, lat)::GEOGRAPHY;
$$;

-- Returns active bingo zones whose polygon contains or is within radius_meters of a point
CREATE OR REPLACE FUNCTION get_bingo_zones_nearby(
  lat FLOAT, lng FLOAT, radius_meters FLOAT DEFAULT 500
)
RETURNS SETOF bingo_zones
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT *
  FROM bingo_zones
  WHERE active = TRUE
    AND ST_DWithin(
      polygon,
      ST_MakePoint(lng, lat)::GEOGRAPHY,
      radius_meters
    );
$$;

-- Coarsen a geography point to ~500m grid (for public water quality map)
CREATE OR REPLACE FUNCTION coarsen_location(
  pt GEOGRAPHY, grid_meters FLOAT DEFAULT 500
)
RETURNS GEOGRAPHY
LANGUAGE sql IMMUTABLE
AS $$
  SELECT ST_SnapToGrid(pt::GEOMETRY, grid_meters / 111320.0)::GEOGRAPHY;
$$;

-- Check 4-hour cooldown: TRUE if user has a non-cooldown session at module_id in last 4 hours
CREATE OR REPLACE FUNCTION check_handwash_cooldown(
  p_user_id UUID, p_module_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM handwash_sessions
    WHERE user_id = p_user_id
      AND module_id = p_module_id
      AND cooldown_active = FALSE
      AND created_at >= NOW() - INTERVAL '4 hours'
  );
$$;

-- Check if water quality test is due at a module (>7 days since last check)
CREATE OR REPLACE FUNCTION is_water_quality_due(p_module_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM water_quality_checks
    WHERE module_id = p_module_id
      AND last_checked_at >= NOW() - INTERVAL '7 days'
  );
$$;

-- Atomic: add points to profile + insert ledger row
CREATE OR REPLACE FUNCTION award_points(
  p_user_id    UUID,
  p_amount     INTEGER,
  p_source     points_source,
  p_reference  UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO points_transactions (user_id, amount, source, reference_id)
  VALUES (p_user_id, p_amount, p_source, p_reference);

  UPDATE profiles
  SET total_points = total_points + p_amount,
      level = GREATEST(1, (total_points + p_amount) / 500 + 1)
  WHERE id = p_user_id;
END;
$$;

-- Extend streak: sets streak_last_date = today and increments streak_count,
-- but only if last date was yesterday (continuation) or today (idempotent).
-- Resets to 1 if the chain was broken.
CREATE OR REPLACE FUNCTION extend_streak(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_last DATE;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT streak_last_date INTO v_last FROM profiles WHERE id = p_user_id;

  IF v_last = v_today THEN
    -- Already extended today, no-op
    RETURN;
  ELSIF v_last = v_today - 1 THEN
    -- Continuation
    UPDATE profiles
    SET streak_count = streak_count + 1,
        streak_last_date = v_today
    WHERE id = p_user_id;
  ELSE
    -- Chain broken (or first ever)
    UPDATE profiles
    SET streak_count = 1,
        streak_last_date = v_today
    WHERE id = p_user_id;
  END IF;
END;
$$;


-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules              ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_owners        ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships          ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges               ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges          ENABLE ROW LEVEL SECURITY;
ALTER TABLE handwash_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_quality_tests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_quality_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_zones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_cards          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_submissions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanup_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE drain_reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions  ENABLE ROW LEVEL SECURITY;


-- Helper: get current user's role from profiles
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Helper: check if current user owns a module
CREATE OR REPLACE FUNCTION owns_module(p_module_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM module_owners
    WHERE module_id = p_module_id AND user_id = auth.uid()
  );
$$;


-- ── profiles ──────────────────────────────────────────────
CREATE POLICY "users can read own profile"
  ON profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "council and admin can read all profiles"
  ON profiles FOR SELECT
  USING (current_user_role() IN ('council', 'admin'));

CREATE POLICY "users can update own profile"
  ON profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "users can insert own profile on signup"
  ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Public read for leaderboard (username + points only — done via a view, see below)


-- ── modules (public read) ─────────────────────────────────
CREATE POLICY "anyone can read modules"
  ON modules FOR SELECT USING (TRUE);

CREATE POLICY "admin can manage modules"
  ON modules FOR ALL USING (current_user_role() = 'admin');


-- ── module_owners ─────────────────────────────────────────
CREATE POLICY "venue owners can read their own module links"
  ON module_owners FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "admin can manage module owners"
  ON module_owners FOR ALL USING (current_user_role() = 'admin');


-- ── friendships ───────────────────────────────────────────
CREATE POLICY "users can see their own friendships"
  ON friendships FOR SELECT
  USING (user_a = auth.uid() OR user_b = auth.uid());

CREATE POLICY "users can create friendship requests"
  ON friendships FOR INSERT
  WITH CHECK (user_a = auth.uid() OR user_b = auth.uid());

CREATE POLICY "users can update own friendship status"
  ON friendships FOR UPDATE
  USING (user_a = auth.uid() OR user_b = auth.uid());


-- ── badges (public read) ──────────────────────────────────
CREATE POLICY "anyone can read badges" ON badges FOR SELECT USING (TRUE);

CREATE POLICY "users can read own user_badges"
  ON user_badges FOR SELECT USING (user_id = auth.uid());


-- ── handwash_sessions ─────────────────────────────────────
CREATE POLICY "users can read own sessions"
  ON handwash_sessions FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users can insert own sessions"
  ON handwash_sessions FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "venue owners can read sessions on their modules"
  ON handwash_sessions FOR SELECT
  USING (module_id IS NOT NULL AND owns_module(module_id));

CREATE POLICY "council can read all sessions"
  ON handwash_sessions FOR SELECT
  USING (current_user_role() IN ('council', 'admin'));


-- ── water_quality_tests ───────────────────────────────────
-- location column is private; location_public is available to all via a view
CREATE POLICY "users can insert own tests"
  ON water_quality_tests FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users can read own tests"
  ON water_quality_tests FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "venue owners can read tests on their modules"
  ON water_quality_tests FOR SELECT
  USING (module_id IS NOT NULL AND owns_module(module_id));

CREATE POLICY "council can read all tests"
  ON water_quality_tests FOR SELECT
  USING (current_user_role() IN ('council', 'admin'));


-- ── water_quality_checks (public read for gate logic) ─────
CREATE POLICY "anyone can read water quality check timestamps"
  ON water_quality_checks FOR SELECT USING (TRUE);

CREATE POLICY "service role can upsert water quality checks"
  ON water_quality_checks FOR ALL
  USING (current_user_role() = 'admin');


-- ── bingo_zones (public read) ─────────────────────────────
CREATE POLICY "anyone can read active bingo zones"
  ON bingo_zones FOR SELECT USING (active = TRUE);

CREATE POLICY "admin can manage bingo zones"
  ON bingo_zones FOR ALL USING (current_user_role() = 'admin');


-- ── bingo_cards ───────────────────────────────────────────
CREATE POLICY "users can manage own bingo cards"
  ON bingo_cards FOR ALL USING (user_id = auth.uid());


-- ── bingo_submissions ─────────────────────────────────────
CREATE POLICY "users can manage own submissions"
  ON bingo_submissions FOR ALL USING (user_id = auth.uid());

CREATE POLICY "council can read all submissions"
  ON bingo_submissions FOR SELECT
  USING (current_user_role() IN ('council', 'admin'));


-- ── cleanup_events ────────────────────────────────────────
CREATE POLICY "anyone can read approved events"
  ON cleanup_events FOR SELECT USING (status = 'approved');

CREATE POLICY "council and admin can read all events"
  ON cleanup_events FOR SELECT
  USING (current_user_role() IN ('council', 'admin'));

CREATE POLICY "admin can approve events"
  ON cleanup_events FOR UPDATE USING (current_user_role() = 'admin');


-- ── event_participants ────────────────────────────────────
CREATE POLICY "users can manage own participation"
  ON event_participants FOR ALL USING (user_id = auth.uid());

CREATE POLICY "council can read all participants"
  ON event_participants FOR SELECT
  USING (current_user_role() IN ('council', 'admin'));


-- ── drain_reports ─────────────────────────────────────────
CREATE POLICY "users can insert and read own reports"
  ON drain_reports FOR ALL USING (user_id = auth.uid());

CREATE POLICY "council can read and update all reports"
  ON drain_reports FOR SELECT
  USING (current_user_role() IN ('council', 'admin'));

CREATE POLICY "council can update report status"
  ON drain_reports FOR UPDATE
  USING (current_user_role() IN ('council', 'admin'));


-- ── points_transactions (append-only) ────────────────────
CREATE POLICY "users can read own transactions"
  ON points_transactions FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "service role inserts transactions"
  ON points_transactions FOR INSERT
  WITH CHECK (current_user_role() = 'admin');


-- ============================================================
-- Public Views (bypass RLS for safe public data)
-- ============================================================

-- Leaderboard: only exposes username, points, level — no PII
CREATE OR REPLACE VIEW leaderboard_public AS
  SELECT id, username, avatar_url, total_points, level, region
  FROM profiles
  ORDER BY total_points DESC;

-- Water quality public map: coarsened location only
CREATE OR REPLACE VIEW water_quality_public AS
  SELECT
    id,
    location_public AS location,
    quality_score,
    ph,
    nitrates,
    hardness,
    turbidity,
    created_at
  FROM water_quality_tests;

-- Module public view: safe fields only
CREATE OR REPLACE VIEW modules_public AS
  SELECT id, location, venue_name, venue_type, status, last_tap_at
  FROM modules
  WHERE status = 'online';
