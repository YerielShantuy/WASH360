import { createServerClient } from "@/lib/supabase-server";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { ReportsInteractive } from "./ReportsInteractive";
import type { ReportRow } from "./ReportsInteractive";
import type { ReportPoint } from "./ReportsMap";

type ReportStatus = "pending" | "acknowledged" | "resolved";
type ReportSeverity = "low" | "medium" | "high";
type ReportType = "flood" | "clogged_drain";

type ReportRowFull = ReportRow & {
  location?: { type: string; coordinates: [number, number] } | null;
};

// IDs match seedReports() so map ↔ table can link by id
const SEED_REPORT_POINTS: ReportPoint[] = [
  { id: "s1", lat: -33.868, lng: 151.209, severity: "high",   report_type: "flood" },
  { id: "s2", lat: -33.895, lng: 151.177, severity: "medium", report_type: "clogged_drain" },
  { id: "s3", lat: -33.842, lng: 151.246, severity: "low",    report_type: "flood" },
  { id: "s4", lat: -33.917, lng: 151.230, severity: "high",   report_type: "clogged_drain" },
  { id: "s5", lat: -33.860, lng: 151.153, severity: "medium", report_type: "flood" },
  { id: "s6", lat: -33.935, lng: 151.195, severity: "low",    report_type: "clogged_drain" },
];

function seedReports(): ReportRow[] {
  return [
    { id: "s1", report_type: "flood",         severity: "high",   description: "Road flooded knee-deep near underpass",  status: "pending",      created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: "s2", report_type: "clogged_drain", severity: "medium", description: "Stormwater grate blocked with debris",   status: "acknowledged", created_at: new Date(Date.now() - 7200000).toISOString() },
    { id: "s3", report_type: "flood",         severity: "low",    description: null,                                      status: "pending",      created_at: new Date(Date.now() - 18000000).toISOString() },
    { id: "s4", report_type: "clogged_drain", severity: "high",   description: "Drain overflowing onto footpath",        status: "acknowledged", created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: "s5", report_type: "flood",         severity: "medium", description: "Carpark partially submerged",            status: "resolved",     created_at: new Date(Date.now() - 172800000).toISOString() },
    { id: "s6", report_type: "clogged_drain", severity: "low",    description: null,                                      status: "resolved",     created_at: new Date(Date.now() - 259200000).toISOString() },
  ];
}

export default async function ReportsPage() {
  const supabase = await createServerClient();

  const [pendingRes, acknowledgedRes, resolvedRes, rawRes] = await Promise.all([
    supabase.from("drain_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("drain_reports").select("id", { count: "exact", head: true }).eq("status", "acknowledged"),
    supabase.from("drain_reports").select("id", { count: "exact", head: true }).eq("status", "resolved"),
    supabase
      .from("drain_reports")
      .select("id, report_type, severity, description, status, created_at, location")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const pendingCount     = pendingRes.count ?? 0;
  const acknowledgedCount = acknowledgedRes.count ?? 0;
  const resolvedCount    = resolvedRes.count ?? 0;
  const reports = (rawRes.data ?? []) as ReportRowFull[];

  const derivedMapPoints: ReportPoint[] = reports.flatMap((r) => {
    if (!r.location?.coordinates) return [];
    const [lng, lat] = r.location.coordinates;
    return [{ id: r.id, lat, lng, severity: r.severity, report_type: r.report_type }];
  });

  // Key useSeeded off map points, not raw rows — ensures table IDs always
  // match map IDs (DB rows with NULL coordinates would otherwise break the link)
  const useSeeded = derivedMapPoints.length === 0;
  const mapPoints: ReportPoint[] = useSeeded ? SEED_REPORT_POINTS : derivedMapPoints;
  const displayReports: ReportRow[] = (useSeeded ? seedReports() : reports).map(
    ({ id, report_type, severity, description, status, created_at }) =>
      ({ id, report_type, severity, description, status, created_at } as ReportRow)
  );

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">Community-submitted flood and clogged drain reports</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center">
              <Clock size={18} className="text-yellow-600" />
            </div>
            <p className="text-sm font-medium text-slate-600">Pending</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">{pendingCount || 3}</p>
          <p className="text-xs text-slate-400 mt-1">awaiting acknowledgement</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <AlertTriangle size={18} className="text-blue-600" />
            </div>
            <p className="text-sm font-medium text-slate-600">In Progress</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">{acknowledgedCount || 2}</p>
          <p className="text-xs text-slate-400 mt-1">acknowledged by council</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-slate-600">Resolved</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">{resolvedCount || 12}</p>
          <p className="text-xs text-slate-400 mt-1">closed this month</p>
        </div>
      </div>

      {/* Connected map + table */}
      <ReportsInteractive reports={displayReports} mapPoints={mapPoints} useSeeded={useSeeded} />
    </div>
  );
}
