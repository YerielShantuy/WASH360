import type { BingoCellState } from "./database";

// Edge Function payloads

export interface ScoreHandwashPayload {
  user_id: string;
  module_id: string;
  technique_score: number;
  coverage_score: number | null;
  duration_seconds: number;
  session_type: "module" | "streak";
}

export interface ScoreHandwashResponse {
  points_awarded: number;
  cooldown_active: boolean;
  cooldown_remaining_seconds: number | null;
  streak_extended: boolean;
  new_streak_count: number;
}

export interface ValidateTrashPhotoPayload {
  photo_path: string;
  expected_category: string | null;
}

export interface ValidateTrashPhotoResponse {
  is_trash: boolean;
  detected_category: string | null;
  confidence: number;
  item_count: number;
}

export interface AnalyzeWaterStripPayload {
  photo_path: string;
  module_id: string | null;
  user_id: string;
}

export interface AnalyzeWaterStripResponse {
  ph: number | null;
  nitrates: number | null;
  hardness: number | null;
  turbidity: number | null;
  quality_score: number;
  parameters_raw: Record<string, number>;
}

export interface SyncOfflineSubmissionsPayload {
  card_id: string;
  submissions: Array<{
    local_id: string;
    category: string;
    photo_base64: string;
    location: { latitude: number; longitude: number };
    created_at: string;
    item_count: number;
    is_extra: boolean;
  }>;
}

export interface CheckBingoCompletionResponse {
  bingo_achieved: boolean;
  clean_sweep: boolean;
  bonus_points: number;
  updated_cells: BingoCellState[];
}

// Water quality check gate
export interface WaterQualityGateResponse {
  should_prompt: boolean;
  days_since_last_check: number | null;
}
