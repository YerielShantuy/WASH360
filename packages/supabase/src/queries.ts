import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type Client = SupabaseClient<Database>;

// Profiles
export async function getProfile(client: Client, userId: string) {
  return client.from("profiles").select("*").eq("id", userId).single();
}

export async function updateProfile(
  client: Client,
  userId: string,
  updates: Database["public"]["Tables"]["profiles"]["Update"]
) {
  return client.from("profiles").update(updates).eq("id", userId);
}

// Modules
export async function getModulesNearby(
  client: Client,
  _lat: number,
  _lng: number,
  radiusMeters = 5000
) {
  // PostGIS ST_DWithin query via RPC — placeholder until DB is set up
  return client.rpc("get_modules_nearby", {
    lat: _lat,
    lng: _lng,
    radius_meters: radiusMeters,
  });
}

export async function getModuleById(client: Client, moduleId: string) {
  return client.from("modules").select("*").eq("id", moduleId).single();
}

// Water quality check gate
export async function getWaterQualityCheck(client: Client, moduleId: string) {
  return client
    .from("water_quality_checks")
    .select("*")
    .eq("module_id", moduleId)
    .maybeSingle();
}

// Bingo zones
export async function getBingoZonesNearby(
  client: Client,
  lat: number,
  lng: number,
  radiusMeters = 500
) {
  return client.rpc("get_bingo_zones_nearby", {
    lat,
    lng,
    radius_meters: radiusMeters,
  });
}

// Bingo card
export async function getActiveBingoCard(
  client: Client,
  userId: string,
  zoneId: string
) {
  return client
    .from("bingo_cards")
    .select("*")
    .eq("user_id", userId)
    .eq("zone_id", zoneId)
    .is("completed_at", null)
    .maybeSingle();
}

// Leaderboard
export async function getLeaderboard(
  client: Client,
  scope: "global" | "local",
  region?: string,
  limit = 50
) {
  let query = client
    .from("profiles")
    .select("id, username, avatar_url, total_points, level, role")
    .order("total_points", { ascending: false })
    .limit(limit);

  if (scope === "local" && region) {
    // Region filter — requires a region column on profiles or a join
    query = query.eq("region" as never, region);
  }

  return query;
}

// Cleanup events
export async function getUpcomingEvents(client: Client, limit = 10) {
  return client
    .from("cleanup_events")
    .select("*")
    .eq("status", "approved")
    .gte("event_date", new Date().toISOString())
    .order("event_date", { ascending: true })
    .limit(limit);
}

// Drain reports (council dashboard)
export async function getDrainReports(
  client: Client,
  filters: {
    status?: "pending" | "acknowledged" | "resolved";
    report_type?: "flood" | "clogged_drain";
    limit?: number;
  } = {}
) {
  let query = client
    .from("drain_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 100);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.report_type) query = query.eq("report_type", filters.report_type);

  return query;
}

// Venue owner — module stats
export async function getVenueOwnerModules(client: Client, userId: string) {
  return client
    .from("module_owners")
    .select("module_id, modules(*)")
    .eq("user_id", userId);
}

export async function getModuleSessionStats(
  client: Client,
  moduleId: string,
  days = 7
) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return client
    .from("handwash_sessions")
    .select("created_at, user_id, technique_score, coverage_score, total_points")
    .eq("module_id", moduleId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });
}
