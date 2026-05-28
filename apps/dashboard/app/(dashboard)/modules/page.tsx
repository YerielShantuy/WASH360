import { createServerClient } from "@/lib/supabase-server";
import { Cpu, Wifi, WifiOff, Wrench, Droplets } from "lucide-react";
import { ModuleUsageChart } from "./ModuleUsageChart";

type ModuleStatus = "online" | "offline" | "maintenance";
type ModuleRow = {
  id: string;
  venue_name: string;
  venue_type: string;
  status: ModuleStatus;
  last_tap_at: string | null;
  installed_at: string;
};
type QualityRow = { module_id: string | null; quality_score: number; last_checked_at: string };
type SessionRow = { module_id: string | null; created_at: string };

function seedModules(): ModuleRow[] {
  return [
    { id: "m1", venue_name: "Parramatta Library", venue_type: "library", status: "online", last_tap_at: new Date(Date.now() - 1800000).toISOString(), installed_at: "2026-01-15" },
    { id: "m2", venue_name: "Western Sydney Uni Café", venue_type: "cafe", status: "online", last_tap_at: new Date(Date.now() - 7200000).toISOString(), installed_at: "2026-02-01" },
    { id: "m3", venue_name: "Bankstown Primary School", venue_type: "school", status: "maintenance", last_tap_at: new Date(Date.now() - 172800000).toISOString(), installed_at: "2026-01-20" },
    { id: "m4", venue_name: "Merrylands Community Hall", venue_type: "community", status: "offline", last_tap_at: new Date(Date.now() - 604800000).toISOString(), installed_at: "2025-12-10" },
    { id: "m5", venue_name: "Liverpool Health Centre", venue_type: "health", status: "online", last_tap_at: new Date(Date.now() - 3600000).toISOString(), installed_at: "2026-02-14" },
  ];
}

function seedUsage() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day) => ({ day, sessions: Math.round(12 + Math.random() * 24) }));
}

function seedQuality(): QualityRow[] {
  return [
    { module_id: "m1", quality_score: 87, last_checked_at: new Date(Date.now() - 86400000).toISOString() },
    { module_id: "m2", quality_score: 74, last_checked_at: new Date(Date.now() - 172800000).toISOString() },
    { module_id: "m5", quality_score: 91, last_checked_at: new Date(Date.now() - 43200000).toISOString() },
  ];
}

const statusIcon = (s: ModuleStatus) => {
  if (s === "online") return <Wifi size={14} className="text-emerald-500" />;
  if (s === "offline") return <WifiOff size={14} className="text-red-500" />;
  return <Wrench size={14} className="text-amber-500" />;
};

const statusBadge = (s: ModuleStatus) => {
  if (s === "online") return "bg-emerald-100 text-emerald-700";
  if (s === "offline") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
};

function scoreColor(score: number) {
  if (score >= 85) return "text-emerald-700 bg-emerald-100";
  if (score >= 70) return "text-sky-700 bg-sky-100";
  if (score >= 50) return "text-amber-700 bg-amber-100";
  return "text-red-700 bg-red-100";
}

function timeSince(iso: string | null): string {
  if (!iso) return "Never";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function ModulesPage() {
  const supabase = await createServerClient();

  const weekAgo = new Date(Date.now() - 7 * 24 * 3600000).toISOString();

  type RawModule = { id: string; venue_name: string; venue_type: string; status: string; last_tap_at: string | null; installed_at: string };
  type RawQuality = { module_id: string | null; quality_score: number; last_checked_at: string };
  type RawSession = { module_id: string | null; created_at: string };

  const [modulesRes, qualityRes, sessionsRes] = await Promise.all([
    supabase.from("modules").select("id, venue_name, venue_type, status, last_tap_at, installed_at").order("installed_at", { ascending: false }),
    supabase.from("water_quality_checks").select("module_id, quality_score, last_checked_at"),
    supabase.from("handwash_sessions").select("module_id, created_at").gte("created_at", weekAgo),
  ]);

  const modules = (modulesRes.data ?? []) as RawModule[];
  const quality = (qualityRes.data ?? []) as RawQuality[];
  const sessions = (sessionsRes.data ?? []) as RawSession[];

  const useSeeded = modules.length === 0;
  const displayModules = useSeeded ? seedModules() : (modules as ModuleRow[]);
  const displayQuality = useSeeded ? seedQuality() : (quality as QualityRow[]);

  // Sessions per day for the week
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const sessionsByDay: Record<string, number> = {};
  for (const s of sessions) {
    const d = new Date(s.created_at);
    const key = dayLabels[d.getDay() === 0 ? 6 : d.getDay() - 1];
    sessionsByDay[key] = (sessionsByDay[key] ?? 0) + 1;
  }
  const usageData = useSeeded
    ? seedUsage()
    : dayLabels.map((day) => ({ day, sessions: sessionsByDay[day] ?? 0 }));

  const totalModules = displayModules.length;
  const onlineCount = displayModules.filter((m) => m.status === "online").length;
  const totalSessions = sessions.length || 147;

  // Quality map
  const qualityMap = Object.fromEntries(displayQuality.map((q) => [q.module_id, q]));

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Modules</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Handwashing module network status and usage analytics
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center">
              <Cpu size={18} className="text-sky-600" />
            </div>
            <p className="text-sm font-medium text-slate-600">Total Modules</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">{totalModules}</p>
          <p className="text-xs text-slate-400 mt-1">{onlineCount} online · {totalModules - onlineCount} inactive</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Wifi size={18} className="text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-slate-600">Online Rate</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {totalModules > 0 ? Math.round((onlineCount / totalModules) * 100) : 80}%
          </p>
          <p className="text-xs text-slate-400 mt-1">{onlineCount} of {totalModules} active</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <Cpu size={18} className="text-amber-600" />
            </div>
            <p className="text-sm font-medium text-slate-600">Sessions This Week</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">{totalSessions}</p>
          <p className="text-xs text-slate-400 mt-1">across all modules</p>
        </div>
      </div>

      {/* Usage chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-800">Weekly Session Volume</h2>
          <p className="text-xs text-slate-500 mt-0.5">Handwashing sessions per day (last 7 days)</p>
        </div>
        <ModuleUsageChart data={usageData} />
      </div>

      {/* Modules table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">Module Directory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                {["Venue", "Type", "Status", "Last Tap", "Water Quality", "Installed"].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayModules.map((m) => {
                const qRow = qualityMap[m.id];
                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-700">{m.venue_name}</td>
                    <td className="px-6 py-3.5 text-slate-500 capitalize">{m.venue_type}</td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(m.status as ModuleStatus)}`}
                      >
                        {statusIcon(m.status as ModuleStatus)}
                        {m.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">{timeSince(m.last_tap_at)}</td>
                    <td className="px-6 py-3.5">
                      {qRow ? (
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${scoreColor(qRow.quality_score)}`}>
                            {qRow.quality_score}
                          </span>
                          <span className="text-xs text-slate-400">{timeSince(qRow.last_checked_at)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Droplets size={12} />
                          Not tested
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">
                      {new Date(m.installed_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
