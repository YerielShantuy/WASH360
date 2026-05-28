import type {
  UserRole,
  SessionType,
  BingoSubmissionStatus,
  EventStatus,
  ReportType,
  ReportStatus,
  ReportSeverity,
  FriendshipStatus,
  PointsSource,
  ModuleStatus,
} from "./enums";

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  total_points: number;
  streak_count: number;
  streak_last_date: string | null;
  level: number;
  role: UserRole;
  created_at: string;
}

export interface Module {
  id: string;
  location: GeoPoint;
  venue_name: string;
  venue_type: string;
  installed_at: string;
  status: ModuleStatus;
  last_tap_at: string | null;
}

export interface ModuleOwner {
  module_id: string;
  user_id: string;
  granted_at: string;
}

export interface Friendship {
  user_a: string;
  user_b: string;
  status: FriendshipStatus;
  created_at: string;
}

export interface UserBadge {
  user_id: string;
  badge_id: string;
  earned_at: string;
}

export interface HandwashSession {
  id: string;
  user_id: string;
  module_id: string | null;
  technique_score: number;
  coverage_score: number | null;
  total_points: number;
  session_type: SessionType;
  duration_seconds: number;
  created_at: string;
}

export interface WaterQualityTest {
  id: string;
  user_id: string;
  module_id: string | null;
  location: GeoPoint;
  location_public: GeoPoint;
  ph: number | null;
  nitrates: number | null;
  hardness: number | null;
  turbidity: number | null;
  quality_score: number;
  photo_path: string;
  created_at: string;
}

export interface WaterQualityCheck {
  id: string;
  module_id: string;
  location: GeoPoint;
  last_checked_at: string;
  last_checked_by: string;
  quality_score: number;
}

export interface BingoZone {
  id: string;
  name: string;
  polygon: GeoPolygon;
  active: boolean;
  created_at: string;
}

export interface BingoCellState {
  category: string;
  status: BingoSubmissionStatus | "unclaimed";
  photo_path: string | null;
  points: number;
}

export interface BingoCard {
  id: string;
  user_id: string;
  zone_id: string;
  started_at: string;
  completed_at: string | null;
  cells: BingoCellState[];
  extra_submissions_count: number;
}

export interface BingoSubmission {
  id: string;
  card_id: string;
  user_id: string;
  category: string;
  photo_path: string;
  ml_confidence: number;
  item_count: number;
  status: BingoSubmissionStatus;
  points_awarded: number;
  location: GeoPoint;
  created_at: string;
  synced_at: string | null;
}

export interface CleanupEvent {
  id: string;
  title: string;
  org_name: string;
  description: string;
  event_date: string;
  location: GeoPoint;
  max_participants: number | null;
  created_by: string;
  status: EventStatus;
  banner_url: string | null;
}

export interface EventParticipant {
  event_id: string;
  user_id: string;
  joined_at: string;
}

export interface DrainReport {
  id: string;
  user_id: string;
  report_type: ReportType;
  severity: ReportSeverity;
  description: string | null;
  photo_path: string;
  location: GeoPoint;
  status: ReportStatus;
  created_at: string;
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  amount: number;
  source: PointsSource;
  reference_id: string;
  created_at: string;
}

// Geo helpers
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface GeoPolygon {
  coordinates: GeoPoint[];
}
