-- ============================================================
-- WASH360 — Full Demo Seed
-- Password for ALL demo accounts: Password123!
--
-- Run order (after initial schema migration):
--   supabase db seed   OR   paste into Supabase SQL editor
--
-- Idempotent: ON CONFLICT DO NOTHING / DO UPDATE throughout.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. AUTH USERS
--    All demo users share the password: Password123!
--    (pgcrypto is enabled by default on Supabase)
-- ────────────────────────────────────────────────────────────
INSERT INTO auth.users (
  instance_id, id, aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, created_at, updated_at,
  confirmation_token, recovery_token,
  email_change_token_new, email_change
) VALUES
  ( '00000000-0000-0000-0000-000000000000',
    'cc100000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated',
    'alex.chen@example.com',
    crypt('Password123!', gen_salt('bf')),
    NOW() - INTERVAL '60 days',
    '{"provider":"email","providers":["email"]}', '{}',
    FALSE, NOW() - INTERVAL '60 days', NOW(),
    '', '', '', '' ),

  ( '00000000-0000-0000-0000-000000000000',
    'cc100000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated',
    'maya.patel@example.com',
    crypt('Password123!', gen_salt('bf')),
    NOW() - INTERVAL '45 days',
    '{"provider":"email","providers":["email"]}', '{}',
    FALSE, NOW() - INTERVAL '45 days', NOW(),
    '', '', '', '' ),

  ( '00000000-0000-0000-0000-000000000000',
    'cc100000-0000-0000-0000-000000000003',
    'authenticated', 'authenticated',
    'jamie.wilson@example.com',
    crypt('Password123!', gen_salt('bf')),
    NOW() - INTERVAL '14 days',
    '{"provider":"email","providers":["email"]}', '{}',
    FALSE, NOW() - INTERVAL '14 days', NOW(),
    '', '', '', '' ),

  ( '00000000-0000-0000-0000-000000000000',
    'cc100000-0000-0000-0000-000000000004',
    'authenticated', 'authenticated',
    'sarah.admin@wash360.gov.au',
    crypt('Password123!', gen_salt('bf')),
    NOW() - INTERVAL '90 days',
    '{"provider":"email","providers":["email"]}', '{}',
    FALSE, NOW() - INTERVAL '90 days', NOW(),
    '', '', '', '' ),

  ( '00000000-0000-0000-0000-000000000000',
    'cc100000-0000-0000-0000-000000000005',
    'authenticated', 'authenticated',
    'council@randwick.nsw.gov.au',
    crypt('Password123!', gen_salt('bf')),
    NOW() - INTERVAL '30 days',
    '{"provider":"email","providers":["email"]}', '{}',
    FALSE, NOW() - INTERVAL '30 days', NOW(),
    '', '', '', '' )
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 2. PROFILES
-- ────────────────────────────────────────────────────────────
INSERT INTO profiles (id, username, total_points, streak_count, streak_last_date, level, role, region, created_at)
VALUES
  ( 'cc100000-0000-0000-0000-000000000001',
    'alex_chen', 1350, 7, CURRENT_DATE, 3, 'user', 'Kensington NSW',
    NOW() - INTERVAL '60 days' ),

  ( 'cc100000-0000-0000-0000-000000000002',
    'maya_patel', 720, 4, CURRENT_DATE, 2, 'user', 'Maroubra NSW',
    NOW() - INTERVAL '45 days' ),

  ( 'cc100000-0000-0000-0000-000000000003',
    'jamie_wilson', 165, 1, CURRENT_DATE - 1, 1, 'user', 'Coogee NSW',
    NOW() - INTERVAL '14 days' ),

  ( 'cc100000-0000-0000-0000-000000000004',
    'sarah_admin', 50, 0, NULL, 1, 'admin', 'Sydney NSW',
    NOW() - INTERVAL '90 days' ),

  ( 'cc100000-0000-0000-0000-000000000005',
    'randwick_council', 0, 0, NULL, 1, 'council', 'Randwick NSW',
    NOW() - INTERVAL '30 days' )
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 3. BADGES
-- ────────────────────────────────────────────────────────────
INSERT INTO badges (id, name, description, condition) VALUES
  ( 'ba100000-0000-0000-0000-000000000001',
    'First Wash',     'Complete your first handwashing session',       '{"source":"handwash","threshold":1}' ),
  ( 'ba100000-0000-0000-0000-000000000002',
    'Streak Starter', 'Maintain a 3-day handwashing streak',           '{"source":"streak","threshold":3}' ),
  ( 'ba100000-0000-0000-0000-000000000003',
    'Week Warrior',   'Maintain a 7-day handwashing streak',           '{"source":"streak","threshold":7}' ),
  ( 'ba100000-0000-0000-0000-000000000004',
    'Bingo Beginner', 'Complete your first Trash Bingo card',          '{"source":"bingo","threshold":1}' ),
  ( 'ba100000-0000-0000-0000-000000000005',
    'Clean Sweep',    'Complete all 16 cells on a Trash Bingo card',   '{"source":"bingo_sweep","threshold":1}' ),
  ( 'ba100000-0000-0000-0000-000000000006',
    'Water Guardian', 'Submit your first water quality test',          '{"source":"water_test","threshold":1}' ),
  ( 'ba100000-0000-0000-0000-000000000007',
    'Community Hero', 'Join your first cleanup event',                 '{"source":"event","threshold":1}' ),
  ( 'ba100000-0000-0000-0000-000000000008',
    'Report Ranger',  'Submit your first flood or drain report',       '{"source":"report","threshold":1}' ),
  ( 'ba100000-0000-0000-0000-000000000009',
    'Centurion',      'Earn 100 points total',                         '{"source":"total_points","threshold":100}' ),
  ( 'ba100000-0000-0000-0000-000000000010',
    'Point Master',   'Earn 1000 points total',                        '{"source":"total_points","threshold":1000}' )
ON CONFLICT (name) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 4. MODULES  (WASH360 handwash stations — Sydney area)
-- ────────────────────────────────────────────────────────────
INSERT INTO modules (id, location, venue_name, venue_type, status, installed_at) VALUES
  ( 'a1000000-0000-0000-0000-000000000001',
    ST_MakePoint(151.2093, -33.8688)::GEOGRAPHY,
    'UNSW Kensington Library', 'university', 'online',
    NOW() - INTERVAL '180 days' ),

  ( 'a1000000-0000-0000-0000-000000000002',
    ST_MakePoint(151.2070, -33.8690)::GEOGRAPHY,
    'UNSW Roundhouse', 'restaurant', 'online',
    NOW() - INTERVAL '170 days' ),

  ( 'a1000000-0000-0000-0000-000000000003',
    ST_MakePoint(151.2140, -33.8683)::GEOGRAPHY,
    'UNSW Squarehouse Café', 'cafe', 'online',
    NOW() - INTERVAL '160 days' ),

  ( 'a1000000-0000-0000-0000-000000000004',
    ST_MakePoint(151.2576, -33.9186)::GEOGRAPHY,
    'Maroubra Surf Club', 'leisure', 'online',
    NOW() - INTERVAL '120 days' ),

  ( 'a1000000-0000-0000-0000-000000000005',
    ST_MakePoint(151.2579, -33.9212)::GEOGRAPHY,
    'Coogee Beach Pavilion', 'leisure', 'online',
    NOW() - INTERVAL '90 days' ),

  ( 'a1000000-0000-0000-0000-000000000006',
    ST_MakePoint(151.2278, -33.8994)::GEOGRAPHY,
    'Randwick Hospital — Main Entry', 'hospital', 'online',
    NOW() - INTERVAL '200 days' )
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 5. BINGO ZONES
-- ────────────────────────────────────────────────────────────
INSERT INTO bingo_zones (id, name, polygon, active) VALUES
  ( 'b1000000-0000-0000-0000-000000000001',
    'Coogee Beach',
    ST_MakeEnvelope(151.2530, -33.9250, 151.2620, -33.9180, 4326)::GEOGRAPHY,
    TRUE ),

  ( 'b1000000-0000-0000-0000-000000000002',
    'Maroubra Beach',
    ST_MakeEnvelope(151.2540, -33.9520, 151.2640, -33.9450, 4326)::GEOGRAPHY,
    TRUE ),

  ( 'b1000000-0000-0000-0000-000000000003',
    'Botany Bay Foreshore',
    ST_MakeEnvelope(151.1900, -33.9600, 151.2050, -33.9500, 4326)::GEOGRAPHY,
    TRUE ),

  ( 'b1000000-0000-0000-0000-000000000004',
    'Bondi Beach',
    ST_MakeEnvelope(151.2720, -33.8950, 151.2820, -33.8880, 4326)::GEOGRAPHY,
    TRUE ),

  ( 'b1000000-0000-0000-0000-000000000005',
    'La Perouse Headland',
    ST_MakeEnvelope(151.2290, -33.9930, 151.2400, -33.9870, 4326)::GEOGRAPHY,
    TRUE )
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 6. FRIENDSHIPS
--    user_a < user_b is required by CHECK constraint
-- ────────────────────────────────────────────────────────────
INSERT INTO friendships (user_a, user_b, status, created_at) VALUES
  -- Alex ↔ Maya  (accepted)
  ( 'cc100000-0000-0000-0000-000000000001',
    'cc100000-0000-0000-0000-000000000002',
    'accepted', NOW() - INTERVAL '40 days' ),
  -- Alex ↔ Jamie (pending)
  ( 'cc100000-0000-0000-0000-000000000001',
    'cc100000-0000-0000-0000-000000000003',
    'pending',  NOW() - INTERVAL '3 days' ),
  -- Maya ↔ Jamie (accepted)
  ( 'cc100000-0000-0000-0000-000000000002',
    'cc100000-0000-0000-0000-000000000003',
    'accepted', NOW() - INTERVAL '10 days' )
ON CONFLICT (user_a, user_b) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 7. HANDWASH SESSIONS
--    session_type: 'module' (at a station) | 'streak' (home, no coverage_score)
--    points ≈ round(avg(technique, coverage) × 0.8)
-- ────────────────────────────────────────────────────────────
INSERT INTO handwash_sessions
  (id, user_id, module_id, technique_score, coverage_score, total_points,
   session_type, duration_seconds, cooldown_active, created_at)
VALUES
  -- Alex  (8 sessions spanning 8 days)
  ( 'aa100000-0000-0000-0000-000000000001',
    'cc100000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    88, 84, 69, 'module', 52, FALSE, NOW() - INTERVAL '7 days' ),

  ( 'aa100000-0000-0000-0000-000000000002',
    'cc100000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000002',
    76, 79, 62, 'module', 47, FALSE, NOW() - INTERVAL '6 days' ),

  ( 'aa100000-0000-0000-0000-000000000003',
    'cc100000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000003',
    91, 86, 71, 'module', 58, FALSE, NOW() - INTERVAL '5 days' ),

  ( 'aa100000-0000-0000-0000-000000000004',
    'cc100000-0000-0000-0000-000000000001',
    NULL,
    82, NULL, 66, 'streak', 38, FALSE, NOW() - INTERVAL '4 days' ),

  ( 'aa100000-0000-0000-0000-000000000005',
    'cc100000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    85, 83, 67, 'module', 55, FALSE, NOW() - INTERVAL '3 days' ),

  -- Cooldown duplicate (same module same day as previous — no points)
  ( 'aa100000-0000-0000-0000-000000000006',
    'cc100000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    80, 78,  0, 'module', 48,  TRUE, NOW() - INTERVAL '3 days' + INTERVAL '2 hours' ),

  ( 'aa100000-0000-0000-0000-000000000007',
    'cc100000-0000-0000-0000-000000000001',
    NULL,
    79, NULL, 63, 'streak', 40, FALSE, NOW() - INTERVAL '2 days' ),

  ( 'aa100000-0000-0000-0000-000000000008',
    'cc100000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000005',
    87, 85, 69, 'module', 53, FALSE, NOW() - INTERVAL '1 day' ),

  -- Maya  (4 sessions)
  ( 'aa100000-0000-0000-0000-000000000009',
    'cc100000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000004',
    73, 76, 60, 'module', 44, FALSE, NOW() - INTERVAL '4 days' ),

  ( 'aa100000-0000-0000-0000-000000000010',
    'cc100000-0000-0000-0000-000000000002',
    NULL,
    70, NULL, 56, 'streak', 35, FALSE, NOW() - INTERVAL '3 days' ),

  ( 'aa100000-0000-0000-0000-000000000011',
    'cc100000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000005',
    81, 78, 64, 'module', 50, FALSE, NOW() - INTERVAL '2 days' ),

  ( 'aa100000-0000-0000-0000-000000000012',
    'cc100000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000002',
    75, 77, 61, 'module', 46, FALSE, NOW() - INTERVAL '1 day' ),

  -- Jamie  (2 sessions)
  ( 'aa100000-0000-0000-0000-000000000013',
    'cc100000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000001',
    66, 70, 54, 'module', 42, FALSE, NOW() - INTERVAL '3 days' ),

  ( 'aa100000-0000-0000-0000-000000000014',
    'cc100000-0000-0000-0000-000000000003',
    NULL,
    71, NULL, 57, 'streak', 36, FALSE, NOW() - INTERVAL '2 days' ),

  -- Sarah  (admin, 1 demo session)
  ( 'aa100000-0000-0000-0000-000000000015',
    'cc100000-0000-0000-0000-000000000004',
    'a1000000-0000-0000-0000-000000000006',
    74, 76, 60, 'module', 45, FALSE, NOW() - INTERVAL '10 days' )
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 8. WATER QUALITY TESTS
--    location   = exact GPS (private, not shown on public map)
--    location_public = snapped to ~500 m grid
-- ────────────────────────────────────────────────────────────
INSERT INTO water_quality_tests
  (id, user_id, module_id, location, location_public,
   ph, nitrates, hardness, turbidity, quality_score, photo_path, created_at)
VALUES
  -- Alex's tests (4)
  ( 'bb100000-0000-0000-0000-000000000001',
    'cc100000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    ST_MakePoint(151.2093, -33.8688)::GEOGRAPHY,
    ST_SnapToGrid(ST_MakePoint(151.2093, -33.8688), 0.005)::GEOGRAPHY,
    7.2, 14.0, 162.0, 1.4, 82, 'seed/wq_placeholder.jpg',
    NOW() - INTERVAL '28 days' ),

  ( 'bb100000-0000-0000-0000-000000000002',
    'cc100000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000005',
    ST_MakePoint(151.2579, -33.9212)::GEOGRAPHY,
    ST_SnapToGrid(ST_MakePoint(151.2579, -33.9212), 0.005)::GEOGRAPHY,
    7.0, 18.5, 138.0, 2.3, 74, 'seed/wq_placeholder.jpg',
    NOW() - INTERVAL '21 days' ),

  ( 'bb100000-0000-0000-0000-000000000003',
    'cc100000-0000-0000-0000-000000000001',
    NULL,
    ST_MakePoint(151.1905, -33.9560)::GEOGRAPHY,
    ST_SnapToGrid(ST_MakePoint(151.1905, -33.9560), 0.005)::GEOGRAPHY,
    6.8, 24.0, 118.0, 3.5, 55, 'seed/wq_placeholder.jpg',
    NOW() - INTERVAL '14 days' ),

  ( 'bb100000-0000-0000-0000-000000000004',
    'cc100000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000002',
    ST_MakePoint(151.2070, -33.8690)::GEOGRAPHY,
    ST_SnapToGrid(ST_MakePoint(151.2070, -33.8690), 0.005)::GEOGRAPHY,
    7.4, 9.0, 180.0, 0.8, 91, 'seed/wq_placeholder.jpg',
    NOW() - INTERVAL '7 days' ),

  -- Maya's tests (3)
  ( 'bb100000-0000-0000-0000-000000000005',
    'cc100000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000004',
    ST_MakePoint(151.2576, -33.9186)::GEOGRAPHY,
    ST_SnapToGrid(ST_MakePoint(151.2576, -33.9186), 0.005)::GEOGRAPHY,
    7.1, 16.0, 148.0, 1.9, 78, 'seed/wq_placeholder.jpg',
    NOW() - INTERVAL '25 days' ),

  ( 'bb100000-0000-0000-0000-000000000006',
    'cc100000-0000-0000-0000-000000000002',
    NULL,
    ST_MakePoint(151.2600, -33.9250)::GEOGRAPHY,
    ST_SnapToGrid(ST_MakePoint(151.2600, -33.9250), 0.005)::GEOGRAPHY,
    6.9, 21.0, 122.0, 2.8, 63, 'seed/wq_placeholder.jpg',
    NOW() - INTERVAL '16 days' ),

  ( 'bb100000-0000-0000-0000-000000000007',
    'cc100000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000005',
    ST_MakePoint(151.2580, -33.9210)::GEOGRAPHY,
    ST_SnapToGrid(ST_MakePoint(151.2580, -33.9210), 0.005)::GEOGRAPHY,
    7.3, 11.0, 168.0, 1.1, 87, 'seed/wq_placeholder.jpg',
    NOW() - INTERVAL '4 days' ),

  -- Jamie (1 test)
  ( 'bb100000-0000-0000-0000-000000000008',
    'cc100000-0000-0000-0000-000000000003',
    NULL,
    ST_MakePoint(151.2540, -33.9520)::GEOGRAPHY,
    ST_SnapToGrid(ST_MakePoint(151.2540, -33.9520), 0.005)::GEOGRAPHY,
    7.0, 19.0, 132.0, 2.6, 69, 'seed/wq_placeholder.jpg',
    NOW() - INTERVAL '5 days' ),

  -- Extra points for the public heatmap (tested by admin — no user attribution needed)
  ( 'bb100000-0000-0000-0000-000000000009',
    'cc100000-0000-0000-0000-000000000004',
    NULL,
    ST_MakePoint(151.2344, -33.9908)::GEOGRAPHY,
    ST_SnapToGrid(ST_MakePoint(151.2344, -33.9908), 0.005)::GEOGRAPHY,
    6.7, 27.0, 108.0, 4.1, 44, 'seed/wq_placeholder.jpg',
    NOW() - INTERVAL '18 days' ),

  ( 'bb100000-0000-0000-0000-000000000010',
    'cc100000-0000-0000-0000-000000000004',
    NULL,
    ST_MakePoint(151.2000, -33.9510)::GEOGRAPHY,
    ST_SnapToGrid(ST_MakePoint(151.2000, -33.9510), 0.005)::GEOGRAPHY,
    7.1, 12.0, 155.0, 1.7, 85, 'seed/wq_placeholder.jpg',
    NOW() - INTERVAL '9 days' )
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 9. WATER QUALITY CHECKS  (latest check per module)
-- ────────────────────────────────────────────────────────────
INSERT INTO water_quality_checks
  (module_id, location, last_checked_at, last_checked_by, quality_score)
VALUES
  ( 'a1000000-0000-0000-0000-000000000001',
    ST_MakePoint(151.2093, -33.8688)::GEOGRAPHY,
    NOW() - INTERVAL '7 days',
    'cc100000-0000-0000-0000-000000000001', 82 ),

  ( 'a1000000-0000-0000-0000-000000000002',
    ST_MakePoint(151.2070, -33.8690)::GEOGRAPHY,
    NOW() - INTERVAL '7 days',
    'cc100000-0000-0000-0000-000000000001', 91 ),

  ( 'a1000000-0000-0000-0000-000000000004',
    ST_MakePoint(151.2576, -33.9186)::GEOGRAPHY,
    NOW() - INTERVAL '8 days',   -- overdue → will prompt next user
    'cc100000-0000-0000-0000-000000000002', 78 ),

  ( 'a1000000-0000-0000-0000-000000000005',
    ST_MakePoint(151.2579, -33.9212)::GEOGRAPHY,
    NOW() - INTERVAL '12 days',  -- overdue
    'cc100000-0000-0000-0000-000000000002', 87 )
ON CONFLICT (module_id) DO UPDATE
  SET last_checked_at = EXCLUDED.last_checked_at,
      last_checked_by  = EXCLUDED.last_checked_by,
      quality_score    = EXCLUDED.quality_score;


-- ────────────────────────────────────────────────────────────
-- 10. BINGO CARDS
--     cells JSONB: [{category, status, photo_path, points, item_count}]
--     status values: "pending" | "verified"
-- ────────────────────────────────────────────────────────────
INSERT INTO bingo_cards
  (id, user_id, zone_id, started_at, completed_at, cells, extra_submissions_count)
VALUES

  -- Alex — COMPLETED card (zone: Coogee Beach)
  ( 'bc100000-0000-0000-0000-000000000001',
    'cc100000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '25 days',
    '[
      {"category":"plastic_bottle","status":"verified","photo_path":"bingo/seed/a1/c00.jpg","points":20,"item_count":1},
      {"category":"plastic_bag","status":"verified","photo_path":"bingo/seed/a1/c01.jpg","points":40,"item_count":2},
      {"category":"aluminium_can","status":"verified","photo_path":"bingo/seed/a1/c02.jpg","points":20,"item_count":1},
      {"category":"paper_cup","status":"verified","photo_path":"bingo/seed/a1/c03.jpg","points":20,"item_count":1},
      {"category":"styrofoam","status":"verified","photo_path":"bingo/seed/a1/c04.jpg","points":20,"item_count":1},
      {"category":"cigarette","status":"verified","photo_path":"bingo/seed/a1/c05.jpg","points":60,"item_count":3},
      {"category":"glass_bottle","status":"verified","photo_path":"bingo/seed/a1/c06.jpg","points":20,"item_count":1},
      {"category":"cardboard","status":"verified","photo_path":"bingo/seed/a1/c07.jpg","points":20,"item_count":1},
      {"category":"plastic_straw","status":"verified","photo_path":"bingo/seed/a1/c08.jpg","points":20,"item_count":1},
      {"category":"plastic_other","status":"verified","photo_path":"bingo/seed/a1/c09.jpg","points":20,"item_count":1},
      {"category":"paper","status":"verified","photo_path":"bingo/seed/a1/c10.jpg","points":20,"item_count":1},
      {"category":"rubber","status":"verified","photo_path":"bingo/seed/a1/c11.jpg","points":120,"item_count":1},
      {"category":"foil","status":"verified","photo_path":"bingo/seed/a1/c12.jpg","points":20,"item_count":1},
      {"category":"mask","status":"verified","photo_path":"bingo/seed/a1/c13.jpg","points":20,"item_count":1},
      {"category":"bottle_cap","status":"verified","photo_path":"bingo/seed/a1/c14.jpg","points":20,"item_count":1},
      {"category":"rope","status":"verified","photo_path":"bingo/seed/a1/c15.jpg","points":20,"item_count":1}
    ]'::jsonb,
    2 ),   -- 2 extra submissions after completing

  -- Alex — IN-PROGRESS card (zone: Maroubra Beach)
  ( 'bc100000-0000-0000-0000-000000000002',
    'cc100000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000002',
    NOW() - INTERVAL '10 days',
    NULL,
    '[
      {"category":"plastic_bottle","status":"verified","photo_path":"bingo/seed/a2/c00.jpg","points":20,"item_count":1},
      {"category":"plastic_bag","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"aluminium_can","status":"verified","photo_path":"bingo/seed/a2/c02.jpg","points":20,"item_count":1},
      {"category":"paper_cup","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"styrofoam","status":"verified","photo_path":"bingo/seed/a2/c04.jpg","points":20,"item_count":1},
      {"category":"cigarette","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"glass_bottle","status":"verified","photo_path":"bingo/seed/a2/c06.jpg","points":20,"item_count":1},
      {"category":"cardboard","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"plastic_straw","status":"verified","photo_path":"bingo/seed/a2/c08.jpg","points":40,"item_count":2},
      {"category":"plastic_other","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"paper","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"rubber","status":"verified","photo_path":"bingo/seed/a2/c11.jpg","points":20,"item_count":1},
      {"category":"foil","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"mask","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"bottle_cap","status":"verified","photo_path":"bingo/seed/a2/c14.jpg","points":20,"item_count":1},
      {"category":"rope","status":"pending","photo_path":null,"points":0,"item_count":0}
    ]'::jsonb,
    0 ),

  -- Maya — IN-PROGRESS card (zone: Botany Bay)
  ( 'bc100000-0000-0000-0000-000000000003',
    'cc100000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000003',
    NOW() - INTERVAL '8 days',
    NULL,
    '[
      {"category":"plastic_bottle","status":"verified","photo_path":"bingo/seed/m1/c00.jpg","points":20,"item_count":1},
      {"category":"plastic_bag","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"aluminium_can","status":"verified","photo_path":"bingo/seed/m1/c02.jpg","points":20,"item_count":1},
      {"category":"paper_cup","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"styrofoam","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"cigarette","status":"verified","photo_path":"bingo/seed/m1/c05.jpg","points":40,"item_count":2},
      {"category":"glass_bottle","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"cardboard","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"plastic_straw","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"plastic_other","status":"verified","photo_path":"bingo/seed/m1/c09.jpg","points":20,"item_count":1},
      {"category":"paper","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"rubber","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"foil","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"mask","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"bottle_cap","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"rope","status":"pending","photo_path":null,"points":0,"item_count":0}
    ]'::jsonb,
    0 ),

  -- Jamie — JUST STARTED card (zone: Bondi Beach)
  ( 'bc100000-0000-0000-0000-000000000004',
    'cc100000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000004',
    NOW() - INTERVAL '2 days',
    NULL,
    '[
      {"category":"plastic_bottle","status":"verified","photo_path":"bingo/seed/j1/c00.jpg","points":20,"item_count":1},
      {"category":"plastic_bag","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"aluminium_can","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"paper_cup","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"styrofoam","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"cigarette","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"glass_bottle","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"cardboard","status":"verified","photo_path":"bingo/seed/j1/c07.jpg","points":20,"item_count":1},
      {"category":"plastic_straw","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"plastic_other","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"paper","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"rubber","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"foil","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"mask","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"bottle_cap","status":"pending","photo_path":null,"points":0,"item_count":0},
      {"category":"rope","status":"pending","photo_path":null,"points":0,"item_count":0}
    ]'::jsonb,
    0 )
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 11. BINGO SUBMISSIONS
--     One row per verified cell.
--     photo_hash must be unique (duplicate-detection key).
-- ────────────────────────────────────────────────────────────
INSERT INTO bingo_submissions
  (id, card_id, user_id, category, photo_path, photo_hash,
   ml_confidence, item_count, is_extra, status, points_awarded,
   location, created_at, synced_at)
VALUES

  -- ── Alex card 1 (completed) — 16 cells ──────────────────
  ('bd100000-0000-0000-0000-000000000001','bc100000-0000-0000-0000-000000000001','cc100000-0000-0000-0000-000000000001',
   'plastic_bottle','bingo/seed/a1/c00.jpg','seed_hash_001',0.932,1,FALSE,'verified',20,
   ST_MakePoint(151.2555,-33.9210)::GEOGRAPHY, NOW()-INTERVAL '29 days', NOW()-INTERVAL '29 days'),

  ('bd100000-0000-0000-0000-000000000002','bc100000-0000-0000-0000-000000000001','cc100000-0000-0000-0000-000000000001',
   'plastic_bag','bingo/seed/a1/c01.jpg','seed_hash_002',0.887,2,FALSE,'verified',40,
   ST_MakePoint(151.2558,-33.9215)::GEOGRAPHY, NOW()-INTERVAL '29 days', NOW()-INTERVAL '29 days'),

  ('bd100000-0000-0000-0000-000000000003','bc100000-0000-0000-0000-000000000001','cc100000-0000-0000-0000-000000000001',
   'aluminium_can','bingo/seed/a1/c02.jpg','seed_hash_003',0.951,1,FALSE,'verified',20,
   ST_MakePoint(151.2560,-33.9220)::GEOGRAPHY, NOW()-INTERVAL '28 days', NOW()-INTERVAL '28 days'),

  ('bd100000-0000-0000-0000-000000000004','bc100000-0000-0000-0000-000000000001','cc100000-0000-0000-0000-000000000001',
   'paper_cup','bingo/seed/a1/c03.jpg','seed_hash_004',0.879,1,FALSE,'verified',20,
   ST_MakePoint(151.2562,-33.9218)::GEOGRAPHY, NOW()-INTERVAL '28 days', NOW()-INTERVAL '28 days'),

  ('bd100000-0000-0000-0000-000000000005','bc100000-0000-0000-0000-000000000001','cc100000-0000-0000-0000-000000000001',
   'styrofoam','bingo/seed/a1/c04.jpg','seed_hash_005',0.903,1,FALSE,'verified',20,
   ST_MakePoint(151.2565,-33.9212)::GEOGRAPHY, NOW()-INTERVAL '27 days', NOW()-INTERVAL '27 days'),

  ('bd100000-0000-0000-0000-000000000006','bc100000-0000-0000-0000-000000000001','cc100000-0000-0000-0000-000000000001',
   'cigarette','bingo/seed/a1/c05.jpg','seed_hash_006',0.862,3,FALSE,'verified',60,
   ST_MakePoint(151.2570,-33.9208)::GEOGRAPHY, NOW()-INTERVAL '27 days', NOW()-INTERVAL '27 days'),

  ('bd100000-0000-0000-0000-000000000007','bc100000-0000-0000-0000-000000000001','cc100000-0000-0000-0000-000000000001',
   'glass_bottle','bingo/seed/a1/c06.jpg','seed_hash_007',0.918,1,FALSE,'verified',20,
   ST_MakePoint(151.2572,-33.9205)::GEOGRAPHY, NOW()-INTERVAL '26 days', NOW()-INTERVAL '26 days'),

  ('bd100000-0000-0000-0000-000000000008','bc100000-0000-0000-0000-000000000001','cc100000-0000-0000-0000-000000000001',
   'cardboard','bingo/seed/a1/c07.jpg','seed_hash_008',0.893,1,FALSE,'verified',20,
   ST_MakePoint(151.2575,-33.9202)::GEOGRAPHY, NOW()-INTERVAL '26 days', NOW()-INTERVAL '26 days'),

  ('bd100000-0000-0000-0000-000000000009','bc100000-0000-0000-0000-000000000001','cc100000-0000-0000-0000-000000000001',
   'plastic_straw','bingo/seed/a1/c08.jpg','seed_hash_009',0.908,1,FALSE,'verified',20,
   ST_MakePoint(151.2578,-33.9200)::GEOGRAPHY, NOW()-INTERVAL '25 days', NOW()-INTERVAL '25 days'),

  ('bd100000-0000-0000-0000-000000000010','bc100000-0000-0000-0000-000000000001','cc100000-0000-0000-0000-000000000001',
   'plastic_other','bingo/seed/a1/c09.jpg','seed_hash_010',0.844,1,FALSE,'verified',20,
   ST_MakePoint(151.2580,-33.9198)::GEOGRAPHY, NOW()-INTERVAL '25 days', NOW()-INTERVAL '25 days'),

  ('bd100000-0000-0000-0000-000000000011','bc100000-0000-0000-0000-000000000001','cc100000-0000-0000-0000-000000000001',
   'paper','bingo/seed/a1/c10.jpg','seed_hash_011',0.871,1,FALSE,'verified',20,
   ST_MakePoint(151.2582,-33.9195)::GEOGRAPHY, NOW()-INTERVAL '25 days', NOW()-INTERVAL '25 days'),

  -- Row completion → bingo bonus included in points_awarded
  ('bd100000-0000-0000-0000-000000000012','bc100000-0000-0000-0000-000000000001','cc100000-0000-0000-0000-000000000001',
   'rubber','bingo/seed/a1/c11.jpg','seed_hash_012',0.925,1,FALSE,'verified',120,
   ST_MakePoint(151.2584,-33.9193)::GEOGRAPHY, NOW()-INTERVAL '25 days', NOW()-INTERVAL '25 days'),

  ('bd100000-0000-0000-0000-000000000013','bc100000-0000-0000-0000-000000000001','cc100000-0000-0000-0000-000000000001',
   'foil','bingo/seed/a1/c12.jpg','seed_hash_013',0.856,1,FALSE,'verified',20,
   ST_MakePoint(151.2586,-33.9190)::GEOGRAPHY, NOW()-INTERVAL '25 days', NOW()-INTERVAL '25 days'),

  ('bd100000-0000-0000-0000-000000000014','bc100000-0000-0000-0000-000000000001','cc100000-0000-0000-0000-000000000001',
   'mask','bingo/seed/a1/c13.jpg','seed_hash_014',0.899,1,FALSE,'verified',20,
   ST_MakePoint(151.2588,-33.9188)::GEOGRAPHY, NOW()-INTERVAL '25 days', NOW()-INTERVAL '25 days'),

  ('bd100000-0000-0000-0000-000000000015','bc100000-0000-0000-0000-000000000001','cc100000-0000-0000-0000-000000000001',
   'bottle_cap','bingo/seed/a1/c14.jpg','seed_hash_015',0.912,1,FALSE,'verified',20,
   ST_MakePoint(151.2590,-33.9185)::GEOGRAPHY, NOW()-INTERVAL '25 days', NOW()-INTERVAL '25 days'),

  ('bd100000-0000-0000-0000-000000000016','bc100000-0000-0000-0000-000000000001','cc100000-0000-0000-0000-000000000001',
   'rope','bingo/seed/a1/c15.jpg','seed_hash_016',0.877,1,FALSE,'verified',20,
   ST_MakePoint(151.2592,-33.9182)::GEOGRAPHY, NOW()-INTERVAL '25 days', NOW()-INTERVAL '25 days'),

  -- Extra submissions after card completion
  ('bd100000-0000-0000-0000-000000000017','bc100000-0000-0000-0000-000000000001','cc100000-0000-0000-0000-000000000001',
   'plastic_bottle','bingo/seed/a1/x01.jpg','seed_hash_017',0.941,2,TRUE,'verified',40,
   ST_MakePoint(151.2560,-33.9208)::GEOGRAPHY, NOW()-INTERVAL '24 days', NOW()-INTERVAL '24 days'),

  ('bd100000-0000-0000-0000-000000000018','bc100000-0000-0000-0000-000000000001','cc100000-0000-0000-0000-000000000001',
   'cigarette','bingo/seed/a1/x02.jpg','seed_hash_018',0.866,4,TRUE,'verified',80,
   ST_MakePoint(151.2563,-33.9205)::GEOGRAPHY, NOW()-INTERVAL '24 days', NOW()-INTERVAL '24 days'),

  -- ── Alex card 2 (in-progress) — 7 verified cells ────────
  ('bd100000-0000-0000-0000-000000000019','bc100000-0000-0000-0000-000000000002','cc100000-0000-0000-0000-000000000001',
   'plastic_bottle','bingo/seed/a2/c00.jpg','seed_hash_019',0.921,1,FALSE,'verified',20,
   ST_MakePoint(151.2576,-33.9186)::GEOGRAPHY, NOW()-INTERVAL '9 days', NOW()-INTERVAL '9 days'),

  ('bd100000-0000-0000-0000-000000000020','bc100000-0000-0000-0000-000000000002','cc100000-0000-0000-0000-000000000001',
   'aluminium_can','bingo/seed/a2/c02.jpg','seed_hash_020',0.888,1,FALSE,'verified',20,
   ST_MakePoint(151.2578,-33.9190)::GEOGRAPHY, NOW()-INTERVAL '8 days', NOW()-INTERVAL '8 days'),

  ('bd100000-0000-0000-0000-000000000021','bc100000-0000-0000-0000-000000000002','cc100000-0000-0000-0000-000000000001',
   'styrofoam','bingo/seed/a2/c04.jpg','seed_hash_021',0.901,1,FALSE,'verified',20,
   ST_MakePoint(151.2580,-33.9192)::GEOGRAPHY, NOW()-INTERVAL '8 days', NOW()-INTERVAL '8 days'),

  ('bd100000-0000-0000-0000-000000000022','bc100000-0000-0000-0000-000000000002','cc100000-0000-0000-0000-000000000001',
   'glass_bottle','bingo/seed/a2/c06.jpg','seed_hash_022',0.915,1,FALSE,'verified',20,
   ST_MakePoint(151.2582,-33.9194)::GEOGRAPHY, NOW()-INTERVAL '7 days', NOW()-INTERVAL '7 days'),

  ('bd100000-0000-0000-0000-000000000023','bc100000-0000-0000-0000-000000000002','cc100000-0000-0000-0000-000000000001',
   'plastic_straw','bingo/seed/a2/c08.jpg','seed_hash_023',0.895,2,FALSE,'verified',40,
   ST_MakePoint(151.2584,-33.9196)::GEOGRAPHY, NOW()-INTERVAL '6 days', NOW()-INTERVAL '6 days'),

  ('bd100000-0000-0000-0000-000000000024','bc100000-0000-0000-0000-000000000002','cc100000-0000-0000-0000-000000000001',
   'rubber','bingo/seed/a2/c11.jpg','seed_hash_024',0.907,1,FALSE,'verified',20,
   ST_MakePoint(151.2586,-33.9198)::GEOGRAPHY, NOW()-INTERVAL '5 days', NOW()-INTERVAL '5 days'),

  ('bd100000-0000-0000-0000-000000000025','bc100000-0000-0000-0000-000000000002','cc100000-0000-0000-0000-000000000001',
   'bottle_cap','bingo/seed/a2/c14.jpg','seed_hash_025',0.882,1,FALSE,'verified',20,
   ST_MakePoint(151.2588,-33.9200)::GEOGRAPHY, NOW()-INTERVAL '4 days', NOW()-INTERVAL '4 days'),

  -- ── Maya card (4 verified cells) ─────────────────────────
  ('bd100000-0000-0000-0000-000000000026','bc100000-0000-0000-0000-000000000003','cc100000-0000-0000-0000-000000000002',
   'plastic_bottle','bingo/seed/m1/c00.jpg','seed_hash_026',0.935,1,FALSE,'verified',20,
   ST_MakePoint(151.1950,-33.9540)::GEOGRAPHY, NOW()-INTERVAL '7 days', NOW()-INTERVAL '7 days'),

  ('bd100000-0000-0000-0000-000000000027','bc100000-0000-0000-0000-000000000003','cc100000-0000-0000-0000-000000000002',
   'aluminium_can','bingo/seed/m1/c02.jpg','seed_hash_027',0.902,1,FALSE,'verified',20,
   ST_MakePoint(151.1955,-33.9545)::GEOGRAPHY, NOW()-INTERVAL '6 days', NOW()-INTERVAL '6 days'),

  ('bd100000-0000-0000-0000-000000000028','bc100000-0000-0000-0000-000000000003','cc100000-0000-0000-0000-000000000002',
   'cigarette','bingo/seed/m1/c05.jpg','seed_hash_028',0.864,2,FALSE,'verified',40,
   ST_MakePoint(151.1960,-33.9550)::GEOGRAPHY, NOW()-INTERVAL '5 days', NOW()-INTERVAL '5 days'),

  ('bd100000-0000-0000-0000-000000000029','bc100000-0000-0000-0000-000000000003','cc100000-0000-0000-0000-000000000002',
   'plastic_other','bingo/seed/m1/c09.jpg','seed_hash_029',0.878,1,FALSE,'verified',20,
   ST_MakePoint(151.1965,-33.9555)::GEOGRAPHY, NOW()-INTERVAL '4 days', NOW()-INTERVAL '4 days'),

  -- ── Jamie card (2 verified cells) ────────────────────────
  ('bd100000-0000-0000-0000-000000000030','bc100000-0000-0000-0000-000000000004','cc100000-0000-0000-0000-000000000003',
   'plastic_bottle','bingo/seed/j1/c00.jpg','seed_hash_030',0.922,1,FALSE,'verified',20,
   ST_MakePoint(151.2745,-33.8920)::GEOGRAPHY, NOW()-INTERVAL '1 day', NOW()-INTERVAL '1 day'),

  ('bd100000-0000-0000-0000-000000000031','bc100000-0000-0000-0000-000000000004','cc100000-0000-0000-0000-000000000003',
   'cardboard','bingo/seed/j1/c07.jpg','seed_hash_031',0.856,1,FALSE,'verified',20,
   ST_MakePoint(151.2750,-33.8925)::GEOGRAPHY, NOW()-INTERVAL '1 day', NOW()-INTERVAL '1 day')

ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 12. DRAIN REPORTS
-- ────────────────────────────────────────────────────────────
INSERT INTO drain_reports
  (id, user_id, report_type, severity, description, photo_path, location, status, created_at)
VALUES
  ('ff100000-0000-0000-0000-000000000001',
   'cc100000-0000-0000-0000-000000000001',
   'flood','high',
   'Road flooded knee-deep near UNSW east gate underpass — cars stalled.',
   'seed/report_placeholder.jpg',
   ST_MakePoint(151.2105, -33.8698)::GEOGRAPHY,
   'acknowledged', NOW() - INTERVAL '3 days'),

  ('ff100000-0000-0000-0000-000000000002',
   'cc100000-0000-0000-0000-000000000002',
   'clogged_drain','medium',
   'Stormwater grate completely blocked with seaweed and plastic debris.',
   'seed/report_placeholder.jpg',
   ST_MakePoint(151.2580, -33.9200)::GEOGRAPHY,
   'pending', NOW() - INTERVAL '5 days'),

  ('ff100000-0000-0000-0000-000000000003',
   'cc100000-0000-0000-0000-000000000001',
   'clogged_drain','high',
   'Drain overflowing onto footpath outside Randwick Hospital — trip hazard.',
   'seed/report_placeholder.jpg',
   ST_MakePoint(151.2278, -33.8994)::GEOGRAPHY,
   'resolved', NOW() - INTERVAL '10 days'),

  ('ff100000-0000-0000-0000-000000000004',
   'cc100000-0000-0000-0000-000000000003',
   'flood','medium',
   'Carpark partially submerged after heavy rain. Water level dropping.',
   'seed/report_placeholder.jpg',
   ST_MakePoint(151.2576, -33.9186)::GEOGRAPHY,
   'resolved', NOW() - INTERVAL '18 days'),

  ('ff100000-0000-0000-0000-000000000005',
   'cc100000-0000-0000-0000-000000000002',
   'flood','low',
   NULL,
   'seed/report_placeholder.jpg',
   ST_MakePoint(151.2150, -33.8750)::GEOGRAPHY,
   'pending', NOW() - INTERVAL '1 day'),

  ('ff100000-0000-0000-0000-000000000006',
   'cc100000-0000-0000-0000-000000000001',
   'clogged_drain','medium',
   'Leaves and rubbish blocking drain at bottom of steep hill — water pooling fast.',
   'seed/report_placeholder.jpg',
   ST_MakePoint(151.2480, -33.8950)::GEOGRAPHY,
   'acknowledged', NOW() - INTERVAL '6 days'),

  ('ff100000-0000-0000-0000-000000000007',
   'cc100000-0000-0000-0000-000000000002',
   'flood','high',
   'Intersection flooded — traffic diverted. Requires urgent attention.',
   'seed/report_placeholder.jpg',
   ST_MakePoint(151.2330, -33.9120)::GEOGRAPHY,
   'pending', NOW() - INTERVAL '2 days'),

  ('ff100000-0000-0000-0000-000000000008',
   'cc100000-0000-0000-0000-000000000003',
   'clogged_drain','low',
   NULL,
   'seed/report_placeholder.jpg',
   ST_MakePoint(151.2020, -33.9550)::GEOGRAPHY,
   'pending', NOW() - INTERVAL '4 days'),

  ('ff100000-0000-0000-0000-000000000009',
   'cc100000-0000-0000-0000-000000000001',
   'flood','medium',
   'Tennis court flooded, water spreading toward adjacent path.',
   'seed/report_placeholder.jpg',
   ST_MakePoint(151.2270, -33.8880)::GEOGRAPHY,
   'resolved', NOW() - INTERVAL '15 days'),

  ('ff100000-0000-0000-0000-000000000010',
   'cc100000-0000-0000-0000-000000000002',
   'clogged_drain','medium',
   'Multiple drains blocked along foreshore walk. Strong smell of sewage.',
   'seed/report_placeholder.jpg',
   ST_MakePoint(151.2760, -33.9310)::GEOGRAPHY,
   'acknowledged', NOW() - INTERVAL '7 days')

ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 13. CLEANUP EVENTS
-- ────────────────────────────────────────────────────────────
INSERT INTO cleanup_events
  (id, title, org_name, description, event_date, location,
   max_participants, created_by, status, created_at)
VALUES
  ('ee100000-0000-0000-0000-000000000001',
   'Coogee Beach Cleanup',
   'Randwick City Council',
   'Join our monthly community cleanup at Coogee. Bags, gloves, and sunscreen provided. All welcome — bring the family!',
   NOW() + INTERVAL '7 days',
   ST_MakePoint(151.2580, -33.9210)::GEOGRAPHY,
   80,
   'cc100000-0000-0000-0000-000000000004',
   'approved', NOW() - INTERVAL '14 days'),

  ('ee100000-0000-0000-0000-000000000002',
   'Botany Bay Shoreline Restoration',
   'Sydney Water',
   'Help clear litter and invasive plants along the Botany Bay foreshore trail. Great for families and school groups.',
   NOW() + INTERVAL '14 days',
   ST_MakePoint(151.1950, -33.9540)::GEOGRAPHY,
   50,
   'cc100000-0000-0000-0000-000000000004',
   'approved', NOW() - INTERVAL '10 days'),

  ('ee100000-0000-0000-0000-000000000003',
   'Maroubra Rock Pool Cleanup',
   'Randwick Environment Network',
   'Restore our beautiful rock pools — collect plastic and debris caught in the reef shelf. BYO wetsuit optional.',
   NOW() - INTERVAL '10 days',   -- past event
   ST_MakePoint(151.2576, -33.9520)::GEOGRAPHY,
   30,
   'cc100000-0000-0000-0000-000000000004',
   'approved', NOW() - INTERVAL '30 days'),

  ('ee100000-0000-0000-0000-000000000004',
   'UNSW Green Week Walkabout',
   'UNSW Sustainability Office',
   'Pick up litter around the UNSW campus and surrounding streets during Green Week. Free reusable kit on the day.',
   NOW() + INTERVAL '3 days',
   ST_MakePoint(151.2093, -33.8688)::GEOGRAPHY,
   120,
   'cc100000-0000-0000-0000-000000000004',
   'approved', NOW() - INTERVAL '7 days'),

  ('ee100000-0000-0000-0000-000000000005',
   'La Perouse Coastal Walk Cleanup',
   'National Parks & Wildlife Service NSW',
   'Walk the La Perouse headland trail and collect litter before peak season. Stunning views, meaningful impact.',
   NOW() + INTERVAL '21 days',
   ST_MakePoint(151.2344, -33.9908)::GEOGRAPHY,
   40,
   'cc100000-0000-0000-0000-000000000004',
   'approved', NOW() - INTERVAL '5 days')

ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 14. EVENT PARTICIPANTS
-- ────────────────────────────────────────────────────────────
INSERT INTO event_participants (event_id, user_id, joined_at) VALUES
  -- Event 1 (Coogee Beach)
  ('ee100000-0000-0000-0000-000000000001','cc100000-0000-0000-0000-000000000001', NOW() - INTERVAL '12 days'),
  ('ee100000-0000-0000-0000-000000000001','cc100000-0000-0000-0000-000000000002', NOW() - INTERVAL '11 days'),
  ('ee100000-0000-0000-0000-000000000001','cc100000-0000-0000-0000-000000000005', NOW() - INTERVAL '10 days'),
  -- Event 2 (Botany Bay)
  ('ee100000-0000-0000-0000-000000000002','cc100000-0000-0000-0000-000000000002', NOW() - INTERVAL '8 days'),
  ('ee100000-0000-0000-0000-000000000002','cc100000-0000-0000-0000-000000000003', NOW() - INTERVAL '7 days'),
  -- Event 3 — past (Maroubra Rock Pool)
  ('ee100000-0000-0000-0000-000000000003','cc100000-0000-0000-0000-000000000001', NOW() - INTERVAL '28 days'),
  ('ee100000-0000-0000-0000-000000000003','cc100000-0000-0000-0000-000000000002', NOW() - INTERVAL '27 days'),
  -- Event 4 (UNSW Green Week)
  ('ee100000-0000-0000-0000-000000000004','cc100000-0000-0000-0000-000000000001', NOW() - INTERVAL '5 days'),
  ('ee100000-0000-0000-0000-000000000004','cc100000-0000-0000-0000-000000000003', NOW() - INTERVAL '4 days'),
  -- Event 5 (La Perouse)
  ('ee100000-0000-0000-0000-000000000005','cc100000-0000-0000-0000-000000000002', NOW() - INTERVAL '3 days')
ON CONFLICT (event_id, user_id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 15. USER BADGES
-- ────────────────────────────────────────────────────────────
INSERT INTO user_badges (user_id, badge_id, earned_at) VALUES
  -- Alex — all 10 badges
  ('cc100000-0000-0000-0000-000000000001','ba100000-0000-0000-0000-000000000001', NOW()-INTERVAL '59 days'),
  ('cc100000-0000-0000-0000-000000000001','ba100000-0000-0000-0000-000000000002', NOW()-INTERVAL '55 days'),
  ('cc100000-0000-0000-0000-000000000001','ba100000-0000-0000-0000-000000000003', NOW()-INTERVAL '50 days'),
  ('cc100000-0000-0000-0000-000000000001','ba100000-0000-0000-0000-000000000004', NOW()-INTERVAL '25 days'),
  ('cc100000-0000-0000-0000-000000000001','ba100000-0000-0000-0000-000000000005', NOW()-INTERVAL '25 days'),
  ('cc100000-0000-0000-0000-000000000001','ba100000-0000-0000-0000-000000000006', NOW()-INTERVAL '28 days'),
  ('cc100000-0000-0000-0000-000000000001','ba100000-0000-0000-0000-000000000007', NOW()-INTERVAL '28 days'),
  ('cc100000-0000-0000-0000-000000000001','ba100000-0000-0000-0000-000000000008', NOW()-INTERVAL '10 days'),
  ('cc100000-0000-0000-0000-000000000001','ba100000-0000-0000-0000-000000000009', NOW()-INTERVAL '45 days'),
  ('cc100000-0000-0000-0000-000000000001','ba100000-0000-0000-0000-000000000010', NOW()-INTERVAL '15 days'),

  -- Maya — 6 badges
  ('cc100000-0000-0000-0000-000000000002','ba100000-0000-0000-0000-000000000001', NOW()-INTERVAL '44 days'),
  ('cc100000-0000-0000-0000-000000000002','ba100000-0000-0000-0000-000000000002', NOW()-INTERVAL '40 days'),
  ('cc100000-0000-0000-0000-000000000002','ba100000-0000-0000-0000-000000000006', NOW()-INTERVAL '25 days'),
  ('cc100000-0000-0000-0000-000000000002','ba100000-0000-0000-0000-000000000007', NOW()-INTERVAL '27 days'),
  ('cc100000-0000-0000-0000-000000000002','ba100000-0000-0000-0000-000000000008', NOW()-INTERVAL '5 days'),
  ('cc100000-0000-0000-0000-000000000002','ba100000-0000-0000-0000-000000000009', NOW()-INTERVAL '30 days'),

  -- Jamie — 1 badge
  ('cc100000-0000-0000-0000-000000000003','ba100000-0000-0000-0000-000000000001', NOW()-INTERVAL '13 days'),

  -- Sarah (admin)
  ('cc100000-0000-0000-0000-000000000004','ba100000-0000-0000-0000-000000000001', NOW()-INTERVAL '89 days')

ON CONFLICT (user_id, badge_id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 16. POINTS TRANSACTIONS  (append-only ledger)
--     source: 'handwash' | 'bingo' | 'event' | 'water_test' | 'report'
-- ────────────────────────────────────────────────────────────
INSERT INTO points_transactions (user_id, amount, source, reference_id, created_at) VALUES

  -- ── Alex — handwash ─────────────────────────────────────
  ('cc100000-0000-0000-0000-000000000001',69,'handwash','aa100000-0000-0000-0000-000000000001',NOW()-INTERVAL '7 days'),
  ('cc100000-0000-0000-0000-000000000001',62,'handwash','aa100000-0000-0000-0000-000000000002',NOW()-INTERVAL '6 days'),
  ('cc100000-0000-0000-0000-000000000001',71,'handwash','aa100000-0000-0000-0000-000000000003',NOW()-INTERVAL '5 days'),
  ('cc100000-0000-0000-0000-000000000001',66,'handwash','aa100000-0000-0000-0000-000000000004',NOW()-INTERVAL '4 days'),
  ('cc100000-0000-0000-0000-000000000001',67,'handwash','aa100000-0000-0000-0000-000000000005',NOW()-INTERVAL '3 days'),
  ('cc100000-0000-0000-0000-000000000001',63,'handwash','aa100000-0000-0000-0000-000000000007',NOW()-INTERVAL '2 days'),
  ('cc100000-0000-0000-0000-000000000001',69,'handwash','aa100000-0000-0000-0000-000000000008',NOW()-INTERVAL '1 day'),

  -- ── Alex — bingo (card 1, 16 cells + 2 extras) ──────────
  ('cc100000-0000-0000-0000-000000000001',20,'bingo','bd100000-0000-0000-0000-000000000001',NOW()-INTERVAL '29 days'),
  ('cc100000-0000-0000-0000-000000000001',40,'bingo','bd100000-0000-0000-0000-000000000002',NOW()-INTERVAL '29 days'),
  ('cc100000-0000-0000-0000-000000000001',20,'bingo','bd100000-0000-0000-0000-000000000003',NOW()-INTERVAL '28 days'),
  ('cc100000-0000-0000-0000-000000000001',20,'bingo','bd100000-0000-0000-0000-000000000004',NOW()-INTERVAL '28 days'),
  ('cc100000-0000-0000-0000-000000000001',20,'bingo','bd100000-0000-0000-0000-000000000005',NOW()-INTERVAL '27 days'),
  ('cc100000-0000-0000-0000-000000000001',60,'bingo','bd100000-0000-0000-0000-000000000006',NOW()-INTERVAL '27 days'),
  ('cc100000-0000-0000-0000-000000000001',20,'bingo','bd100000-0000-0000-0000-000000000007',NOW()-INTERVAL '26 days'),
  ('cc100000-0000-0000-0000-000000000001',20,'bingo','bd100000-0000-0000-0000-000000000008',NOW()-INTERVAL '26 days'),
  ('cc100000-0000-0000-0000-000000000001',20,'bingo','bd100000-0000-0000-0000-000000000009',NOW()-INTERVAL '25 days'),
  ('cc100000-0000-0000-0000-000000000001',20,'bingo','bd100000-0000-0000-0000-000000000010',NOW()-INTERVAL '25 days'),
  ('cc100000-0000-0000-0000-000000000001',20,'bingo','bd100000-0000-0000-0000-000000000011',NOW()-INTERVAL '25 days'),
  ('cc100000-0000-0000-0000-000000000001',120,'bingo','bd100000-0000-0000-0000-000000000012',NOW()-INTERVAL '25 days'),  -- includes bingo bonus
  ('cc100000-0000-0000-0000-000000000001',20,'bingo','bd100000-0000-0000-0000-000000000013',NOW()-INTERVAL '25 days'),
  ('cc100000-0000-0000-0000-000000000001',20,'bingo','bd100000-0000-0000-0000-000000000014',NOW()-INTERVAL '25 days'),
  ('cc100000-0000-0000-0000-000000000001',20,'bingo','bd100000-0000-0000-0000-000000000015',NOW()-INTERVAL '25 days'),
  ('cc100000-0000-0000-0000-000000000001',20,'bingo','bd100000-0000-0000-0000-000000000016',NOW()-INTERVAL '25 days'),
  ('cc100000-0000-0000-0000-000000000001',40,'bingo','bd100000-0000-0000-0000-000000000017',NOW()-INTERVAL '24 days'),
  ('cc100000-0000-0000-0000-000000000001',80,'bingo','bd100000-0000-0000-0000-000000000018',NOW()-INTERVAL '24 days'),

  -- ── Alex — bingo (card 2, in-progress) ──────────────────
  ('cc100000-0000-0000-0000-000000000001',20,'bingo','bd100000-0000-0000-0000-000000000019',NOW()-INTERVAL '9 days'),
  ('cc100000-0000-0000-0000-000000000001',20,'bingo','bd100000-0000-0000-0000-000000000020',NOW()-INTERVAL '8 days'),
  ('cc100000-0000-0000-0000-000000000001',20,'bingo','bd100000-0000-0000-0000-000000000021',NOW()-INTERVAL '8 days'),
  ('cc100000-0000-0000-0000-000000000001',20,'bingo','bd100000-0000-0000-0000-000000000022',NOW()-INTERVAL '7 days'),
  ('cc100000-0000-0000-0000-000000000001',40,'bingo','bd100000-0000-0000-0000-000000000023',NOW()-INTERVAL '6 days'),
  ('cc100000-0000-0000-0000-000000000001',20,'bingo','bd100000-0000-0000-0000-000000000024',NOW()-INTERVAL '5 days'),
  ('cc100000-0000-0000-0000-000000000001',20,'bingo','bd100000-0000-0000-0000-000000000025',NOW()-INTERVAL '4 days'),

  -- ── Alex — water quality tests ───────────────────────────
  ('cc100000-0000-0000-0000-000000000001',50,'water_test','bb100000-0000-0000-0000-000000000001',NOW()-INTERVAL '28 days'),
  ('cc100000-0000-0000-0000-000000000001',50,'water_test','bb100000-0000-0000-0000-000000000002',NOW()-INTERVAL '21 days'),
  ('cc100000-0000-0000-0000-000000000001',50,'water_test','bb100000-0000-0000-0000-000000000003',NOW()-INTERVAL '14 days'),
  ('cc100000-0000-0000-0000-000000000001',50,'water_test','bb100000-0000-0000-0000-000000000004',NOW()-INTERVAL '7 days'),

  -- ── Alex — events attended ───────────────────────────────
  ('cc100000-0000-0000-0000-000000000001',75,'event','ee100000-0000-0000-0000-000000000003',NOW()-INTERVAL '28 days'),
  ('cc100000-0000-0000-0000-000000000001',75,'event','ee100000-0000-0000-0000-000000000004',NOW()-INTERVAL '5 days'),

  -- ── Alex — drain reports ─────────────────────────────────
  ('cc100000-0000-0000-0000-000000000001',25,'report','ff100000-0000-0000-0000-000000000001',NOW()-INTERVAL '3 days'),
  ('cc100000-0000-0000-0000-000000000001',25,'report','ff100000-0000-0000-0000-000000000003',NOW()-INTERVAL '10 days'),

  -- ── Maya — handwash ──────────────────────────────────────
  ('cc100000-0000-0000-0000-000000000002',60,'handwash','aa100000-0000-0000-0000-000000000009',NOW()-INTERVAL '4 days'),
  ('cc100000-0000-0000-0000-000000000002',56,'handwash','aa100000-0000-0000-0000-000000000010',NOW()-INTERVAL '3 days'),
  ('cc100000-0000-0000-0000-000000000002',64,'handwash','aa100000-0000-0000-0000-000000000011',NOW()-INTERVAL '2 days'),
  ('cc100000-0000-0000-0000-000000000002',61,'handwash','aa100000-0000-0000-0000-000000000012',NOW()-INTERVAL '1 day'),

  -- ── Maya — bingo ─────────────────────────────────────────
  ('cc100000-0000-0000-0000-000000000002',20,'bingo','bd100000-0000-0000-0000-000000000026',NOW()-INTERVAL '7 days'),
  ('cc100000-0000-0000-0000-000000000002',20,'bingo','bd100000-0000-0000-0000-000000000027',NOW()-INTERVAL '6 days'),
  ('cc100000-0000-0000-0000-000000000002',40,'bingo','bd100000-0000-0000-0000-000000000028',NOW()-INTERVAL '5 days'),
  ('cc100000-0000-0000-0000-000000000002',20,'bingo','bd100000-0000-0000-0000-000000000029',NOW()-INTERVAL '4 days'),

  -- ── Maya — water tests ───────────────────────────────────
  ('cc100000-0000-0000-0000-000000000002',50,'water_test','bb100000-0000-0000-0000-000000000005',NOW()-INTERVAL '25 days'),
  ('cc100000-0000-0000-0000-000000000002',50,'water_test','bb100000-0000-0000-0000-000000000006',NOW()-INTERVAL '16 days'),
  ('cc100000-0000-0000-0000-000000000002',50,'water_test','bb100000-0000-0000-0000-000000000007',NOW()-INTERVAL '4 days'),

  -- ── Maya — events ────────────────────────────────────────
  ('cc100000-0000-0000-0000-000000000002',75,'event','ee100000-0000-0000-0000-000000000003',NOW()-INTERVAL '27 days'),
  ('cc100000-0000-0000-0000-000000000002',75,'event','ee100000-0000-0000-0000-000000000001',NOW()-INTERVAL '11 days'),

  -- ── Maya — report ────────────────────────────────────────
  ('cc100000-0000-0000-0000-000000000002',25,'report','ff100000-0000-0000-0000-000000000002',NOW()-INTERVAL '5 days'),

  -- ── Jamie ────────────────────────────────────────────────
  ('cc100000-0000-0000-0000-000000000003',54,'handwash','aa100000-0000-0000-0000-000000000013',NOW()-INTERVAL '3 days'),
  ('cc100000-0000-0000-0000-000000000003',57,'handwash','aa100000-0000-0000-0000-000000000014',NOW()-INTERVAL '2 days'),
  ('cc100000-0000-0000-0000-000000000003',20,'bingo','bd100000-0000-0000-0000-000000000030',NOW()-INTERVAL '1 day'),
  ('cc100000-0000-0000-0000-000000000003',20,'bingo','bd100000-0000-0000-0000-000000000031',NOW()-INTERVAL '1 day'),
  ('cc100000-0000-0000-0000-000000000003',14,'report','ff100000-0000-0000-0000-000000000004',NOW()-INTERVAL '18 days'),

  -- ── Sarah ────────────────────────────────────────────────
  ('cc100000-0000-0000-0000-000000000004',60,'handwash','aa100000-0000-0000-0000-000000000015',NOW()-INTERVAL '10 days');
