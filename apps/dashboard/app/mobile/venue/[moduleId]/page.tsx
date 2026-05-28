import { createServerClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Droplets, Activity, Users, AlertTriangle } from "lucide-react";

type Props = { params: Promise<{ moduleId: string }> };

export default async function VenuePage({ params }: Props) {
  const { moduleId } = await params;
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/mobile/sign-in");

  const db = supabase as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  // Verify user owns this module
  const { data: ownership } = await db
    .from("module_owners")
    .select("module_id")
    .eq("module_id", moduleId)
    .eq("user_id", session.user.id)
    .maybeSingle() as { data: { module_id: string } | null };

  if (!ownership && moduleId !== "demo-module") {
    // Demo bypass for development
    const { data: profile } = await db
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single() as { data: { role: string } | null };

    if (profile?.role !== "venue_owner" && profile?.role !== "admin") notFound();
  }

  // Fetch module details
  const { data: module } = await db
    .from("modules")
    .select("id, venue_name, venue_type, status, last_tap_at, installed_at")
    .eq("id", moduleId)
    .maybeSingle() as { data: { id: string; venue_name: string; venue_type: string; status: string; last_tap_at: string | null; installed_at: string } | null };

  // Demo fallback
  const mod = module ?? {
    id: moduleId,
    venue_name: "Demo Venue",
    venue_type: "School",
    status: "online",
    last_tap_at: new Date(Date.now() - 30 * 60000).toISOString(),
    installed_at: "2025-01-15T00:00:00Z",
  };

  // Session stats (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: sessionCount } = await db
    .from("handwash_sessions")
    .select("id", { count: "exact", head: true })
    .eq("module_id", moduleId)
    .gte("created_at", sevenDaysAgo) as { count: number | null };

  // Water quality (latest)
  const { data: waterQuality } = await db
    .from("water_quality_checks")
    .select("quality_score, last_checked_at")
    .eq("module_id", moduleId)
    .order("last_checked_at", { ascending: false })
    .limit(1)
    .maybeSingle() as { data: { quality_score: number; last_checked_at: string } | null };

  const statusColor = mod.status === "online" ? "bg-emerald-100 text-emerald-700" :
    mod.status === "offline" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";

  const wqColor = (score: number) =>
    score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600";

  return (
    <div className="flex flex-col min-h-full bg-[#F0F9FF]">
      {/* Header */}
      <div className="bg-sky-600 pt-12 pb-6 px-5 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/mobile/account" className="p-1 -ml-1">
            <ChevronLeft size={24} className="text-white/80" />
          </Link>
          <h1 className="font-black text-xl flex-1">My Venue</h1>
        </div>
        <p className="text-sky-200 text-xs font-semibold uppercase tracking-wider mb-1">{mod.venue_type}</p>
        <h2 className="font-black text-2xl">{mod.venue_name}</h2>
        <div className="flex items-center gap-2 mt-2">
          <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${statusColor}`}>
            {mod.status}
          </span>
          {mod.last_tap_at && (
            <span className="text-sky-200 text-xs">
              Last used {new Date(mod.last_tap_at).toLocaleString("en-AU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-sky-500" />
              <p className="text-slate-500 text-xs font-semibold">Sessions (7 days)</p>
            </div>
            <p className="text-slate-900 font-black text-3xl">{sessionCount ?? 0}</p>
            <p className="text-slate-400 text-xs mt-0.5">handwash sessions</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Droplets size={16} className="text-emerald-500" />
              <p className="text-slate-500 text-xs font-semibold">Water Quality</p>
            </div>
            {waterQuality ? (
              <>
                <p className={`font-black text-3xl ${wqColor(waterQuality.quality_score)}`}>
                  {waterQuality.quality_score}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {new Date(waterQuality.last_checked_at).toLocaleDateString("en-AU", { month: "short", day: "numeric" })}
                </p>
              </>
            ) : (
              <>
                <p className="text-slate-300 font-black text-3xl">—</p>
                <p className="text-slate-400 text-xs mt-0.5">No data yet</p>
              </>
            )}
          </div>
        </div>

        {/* Module info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} className="text-sky-500" />
            <p className="text-slate-700 font-bold text-sm">Module Details</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Module ID</span>
              <span className="text-slate-700 font-mono text-sm">{mod.id.slice(0, 8)}…</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Installed</span>
              <span className="text-slate-700 text-sm">{new Date(mod.installed_at).toLocaleDateString("en-AU", { year: "numeric", month: "short", day: "numeric" })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Venue Type</span>
              <span className="text-slate-700 text-sm">{mod.venue_type}</span>
            </div>
          </div>
        </div>

        {/* Alerts / nudges */}
        {!waterQuality && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-500 flex-none mt-0.5" />
            <div>
              <p className="text-amber-800 font-bold text-sm">Water Quality Check Due</p>
              <p className="text-amber-700 text-xs mt-0.5 leading-relaxed">
                No water quality data recorded. Prompt users to run a water strip test.
              </p>
            </div>
          </div>
        )}

        {mod.status === "offline" && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 flex-none mt-0.5" />
            <div>
              <p className="text-red-800 font-bold text-sm">Module Offline</p>
              <p className="text-red-700 text-xs mt-0.5 leading-relaxed">
                Your module is not responding. Contact support or check the NFC hardware.
              </p>
            </div>
          </div>
        )}

        <p className="text-center text-slate-300 text-xs pb-4">
          Data refreshes in real-time via Supabase
        </p>
      </div>
    </div>
  );
}
