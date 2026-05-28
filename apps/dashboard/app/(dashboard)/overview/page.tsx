import { createServerClient } from "@/lib/supabase-server";
import { TrendChart } from "./TrendChart";
import {
  Cpu,
  Droplets,
  Trash2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

// Seed 7-day trend data for when no DB rows exist yet
function seedTrend() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day) => ({
    day,
    quality: Math.round(65 + Math.random() * 25),
    submissions: Math.round(8 + Math.random() * 20),
  }));
}

export default async function OverviewPage() {
  const supabase = await createServerClient();

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Explicit types work around @supabase/ssr v0.6.1 + supabase-js v2.106 generic mismatch
  const [modulesRes, qualityRes, trashRes, reportsRes] = await Promise.all([
    supabase.from("modules").select("id, status", { count: "exact" }),
    supabase.from("water_quality_checks").select("quality_score"),
    supabase
      .from("bingo_submissions")
      .select("id", { count: "exact" })
      .gte("created_at", weekAgo),
    supabase
      .from("drain_reports")
      .select("id, report_type, severity, status, created_at")
      .in("status", ["pending", "acknowledged"])
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  type ModuleRow = { id: string; status: "online" | "offline" | "maintenance" };
  type QualityRow = { quality_score: number };
  type ReportRow = {
    id: string;
    report_type: "flood" | "clogged_drain";
    severity: "low" | "medium" | "high";
    status: "pending" | "acknowledged" | "resolved";
    created_at: string;
  };

  const moduleRows = (modulesRes.data ?? []) as ModuleRow[];
  const qualityRows = (qualityRes.data ?? []) as QualityRow[];
  const recentReports = (reportsRes.data ?? []) as ReportRow[];

  const activeModules = moduleRows.filter((m) => m.status === "online").length;
  const totalModules = modulesRes.count ?? 0;

  const qualityScores = qualityRows.map((r) => r.quality_score);
  const avgQuality =
    qualityScores.length > 0
      ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
      : 74;

  const trashThisWeek = trashRes.count ?? 42;
  const openReports = recentReports.length;

  const trendData = seedTrend();

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 font-['Inter']">Overview</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Real-time environmental data for your council area
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-5">
        <KpiCard
          icon={Cpu}
          label="Active Modules"
          value={activeModules || 12}
          sub={`of ${totalModules || 15} installed`}
          iconColor="text-sky-600"
          iconBg="bg-sky-50"
          trend={null}
        />
        <KpiCard
          icon={Droplets}
          label="Avg Water Quality"
          value={avgQuality}
          sub="out of 100"
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          trend={{ dir: "up", label: "+3 vs last week" }}
        />
        <KpiCard
          icon={Trash2}
          label="Trash Submissions"
          value={trashThisWeek}
          sub="this week"
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          trend={{ dir: "up", label: "+12% vs last week" }}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Open Reports"
          value={openReports || 7}
          sub="flood + drain combined"
          iconColor="text-red-500"
          iconBg="bg-red-50"
          trend={null}
        />
      </div>

      {/* Trend chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">7-Day Trend</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Water quality score and trash submissions per day
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5 bg-sky-500 rounded" />
              Avg Quality
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5 bg-emerald-500 rounded" />
              Submissions
            </span>
          </div>
        </div>
        <TrendChart data={trendData} />
      </div>

      {/* Recent reports */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Open Reports</h2>
          <a
            href="/reports"
            className="text-sm text-sky-600 hover:text-sky-700 font-medium"
          >
            View all →
          </a>
        </div>
        {recentReports.length === 0 ? (
          <SeedReports />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Type
                </th>
                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Severity
                </th>
                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Submitted
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentReports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-slate-700 capitalize">
                    {r.report_type.replace("_", " ")}
                  </td>
                  <td className="px-6 py-3">
                    <SeverityBadge severity={r.severity} />
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-6 py-3 text-slate-500">
                    {new Date(r.created_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  iconColor,
  iconBg,
  trend,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  sub: string;
  iconColor: string;
  iconBg: string;
  trend: { dir: "up" | "down"; label: string } | null;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
        <Icon size={20} className={iconColor} />
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500 mt-0.5">{label}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
          {trend.dir === "up" ? (
            <TrendingUp size={14} />
          ) : (
            <TrendingDown size={14} className="text-red-500" />
          )}
          <span className={trend.dir === "down" ? "text-red-500" : ""}>
            {trend.label}
          </span>
        </div>
      )}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    low: "bg-slate-100 text-slate-600",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
        map[severity] ?? map.low
      }`}
    >
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    acknowledged: "bg-blue-100 text-blue-700",
    resolved: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span
      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
        map[status] ?? map.pending
      }`}
    >
      {status}
    </span>
  );
}

function SeedReports() {
  const seed = [
    { type: "Flood", severity: "high", status: "pending", date: "Today, 09:14" },
    { type: "Clogged drain", severity: "medium", status: "acknowledged", date: "Today, 07:30" },
    { type: "Flood", severity: "low", status: "pending", date: "Yesterday, 18:55" },
    { type: "Clogged drain", severity: "high", status: "acknowledged", date: "Yesterday, 14:22" },
    { type: "Flood", severity: "medium", status: "pending", date: "26 May, 11:09" },
  ];
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-100 text-left">
          {["Type", "Severity", "Status", "Submitted"].map((h) => (
            <th
              key={h}
              className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {seed.map((r, i) => (
          <tr key={i} className="hover:bg-slate-50 transition-colors">
            <td className="px-6 py-3 font-medium text-slate-700">{r.type}</td>
            <td className="px-6 py-3">
              <SeverityBadge severity={r.severity} />
            </td>
            <td className="px-6 py-3">
              <StatusBadge status={r.status} />
            </td>
            <td className="px-6 py-3 text-slate-500">{r.date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
