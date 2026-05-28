export type UserRole = "user" | "venue_owner" | "council" | "admin";

export type SessionType = "module" | "streak";

export type BingoSubmissionStatus = "pending" | "verified" | "rejected";

export type EventStatus = "pending" | "approved" | "cancelled";

export type ReportType = "flood" | "clogged_drain";

export type ReportStatus = "pending" | "acknowledged" | "resolved";

export type ReportSeverity = "low" | "medium" | "high";

export type FriendshipStatus = "pending" | "accepted";

export type PointsSource =
  | "handwash"
  | "bingo"
  | "event"
  | "water_test"
  | "report";

export type ModuleStatus = "online" | "offline" | "maintenance";
