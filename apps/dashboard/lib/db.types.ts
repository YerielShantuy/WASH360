/**
 * Local type aliases extracted directly from the shared Database type.
 * Used to work around the cross-package generic inference issue where
 * supabase.from("table").select().single() resolves data as `never`.
 */
import type { Database } from "@wash360/supabase";

type Tables = Database["public"]["Tables"];

export type ProfileRow = Tables["profiles"]["Row"];
export type EventRow = Tables["cleanup_events"]["Row"];
export type WaterQualityTestRow = Tables["water_quality_tests"]["Row"];
export type BingoZoneRow = Tables["bingo_zones"]["Row"];
export type BingoCardRow = Tables["bingo_cards"]["Row"];
export type BingoSubmissionRow = Tables["bingo_submissions"]["Row"];
export type DrainReportRow = Tables["drain_reports"]["Row"];
export type HandwashSessionRow = Tables["handwash_sessions"]["Row"];
export type FriendshipRow = Tables["friendships"]["Row"];
export type PointsTransactionRow = Tables["points_transactions"]["Row"];
export type ModuleRow = Tables["modules"]["Row"];

/** Pick specific columns from a row (mirrors select() column list) */
export type Pick<T, K extends keyof T> = { [P in K]: T[P] };
