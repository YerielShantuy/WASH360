import Link from "next/link";
import { Droplets, Flame, Star, MapPin, ChevronRight, Trophy } from "lucide-react";
import { createServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import type { ProfileRow, EventRow, WaterQualityTestRow, BingoZoneRow } from "@/lib/db.types";

function scoreColor(score: number) {
  if (score >= 80) return "bg-emerald-100 text-emerald-700";
  if (score >= 60) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function scoreLabel(score: number) {
  if (score >= 80) return "Good";
  if (score >= 60) return "Fair";
  return "Poor";
}

export default async function MobileHomePage() {
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/mobile/sign-in");

  const userId = session.user.id;

  // Fetch all data in parallel
  const [profileRes, eventsRes, waterRes, zonesRes] = await Promise.all([
    supabase.from("profiles").select("username, total_points, streak_count, level").eq("id", userId).single(),
    supabase.from("cleanup_events").select("id, title, org_name, event_date, location").eq("status", "approved").gte("event_date", new Date().toISOString()).order("event_date").limit(5),
    supabase.from("water_quality_tests").select("id, quality_score, created_at").order("created_at", { ascending: false }).limit(3),
    supabase.from("bingo_zones").select("id, name").eq("active", true).limit(1),
  ]);

  const profile = profileRes.data as Pick<ProfileRow, "username" | "total_points" | "streak_count" | "level"> | null;
  const events = (eventsRes.data ?? []) as Pick<EventRow, "id" | "title" | "org_name" | "event_date" | "location">[];
  const waterTests = (waterRes.data ?? []) as Pick<WaterQualityTestRow, "id" | "quality_score" | "created_at">[];
  const nearestZone = ((zonesRes.data ?? []) as Pick<BingoZoneRow, "id" | "name">[])[0] ?? null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="bg-sky-600 pt-12 pb-6 px-5 text-white">
        <p className="text-sky-200 text-sm font-medium mb-1">{greeting} 👋</p>
        <h1 className="text-2xl font-black tracking-tight">{profile?.username ?? "Traveller"}</h1>
        <div className="flex gap-2 mt-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
            <Star size={14} fill="white" />
            <span className="text-sm font-bold">{(profile?.total_points ?? 0).toLocaleString()} pts</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
            <Flame size={14} className="text-amber-300" />
            <span className="text-sm font-bold">{profile?.streak_count ?? 0}-day streak</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
            <Trophy size={14} className="text-yellow-300" />
            <span className="text-sm font-bold">Lv {profile?.level ?? 1}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-4 py-5">
        {/* Trash Bingo CTA */}
        {nearestZone ? (
          <Link href={`/mobile/bingo?zone=${nearestZone.id}`}>
            <div className="bg-gradient-to-br from-sky-500 to-sky-700 rounded-2xl p-5 text-white shadow-lg active:scale-95 transition-transform">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sky-200 text-xs font-semibold uppercase tracking-wider mb-1">Trash Bingo · Nearby</p>
                  <h2 className="text-xl font-black">{nearestZone.name}</h2>
                  <p className="text-sky-100 text-sm mt-1">Tap to start playing</p>
                </div>
                <div className="text-4xl">🎯</div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-sky-100 text-sm font-semibold">
                <span>Play Trash Bingo</span>
                <ChevronRight size={16} />
              </div>
            </div>
          </Link>
        ) : (
          <div className="bg-slate-100 rounded-2xl p-5 text-center">
            <p className="text-slate-400 text-sm">No active bingo zones nearby right now</p>
          </div>
        )}

        {/* Upcoming Events */}
        <section>
          <h3 className="text-slate-800 font-bold text-base mb-3">Upcoming Events</h3>
          {events.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
              <p className="text-slate-400 text-sm">No upcoming events — check back soon</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
              {events.map((ev) => (
                <div key={ev.id} className="flex-none w-52 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                  <div className="text-2xl mb-2">🧹</div>
                  <p className="text-slate-800 font-semibold text-sm leading-tight">{ev.title}</p>
                  <p className="text-slate-400 text-xs mt-1">{ev.org_name}</p>
                  <div className="flex items-center gap-1 text-slate-400 text-xs mt-2">
                    <MapPin size={11} />
                    <span>{new Date(ev.event_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
                  </div>
                  <div className="mt-3 bg-sky-50 rounded-lg px-3 py-1.5 text-center">
                    <span className="text-sky-600 text-xs font-bold">RSVP</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Water Quality */}
        <section>
          <h3 className="text-slate-800 font-bold text-base mb-3">Recent Water Quality</h3>
          {waterTests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
              <p className="text-slate-400 text-sm">No readings yet — be the first to test!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {waterTests.map((w, i) => (
                <div key={w.id} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center">
                      <Droplets size={18} className="text-sky-500" />
                    </div>
                    <div>
                      <p className="text-slate-800 font-semibold text-sm">Reading #{i + 1}</p>
                      <p className="text-slate-400 text-xs">Score: {w.quality_score}/100</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${scoreColor(w.quality_score)}`}>
                    {scoreLabel(w.quality_score)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section>
          <h3 className="text-slate-800 font-bold text-base mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/mobile/report">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2 active:scale-95 transition-transform">
                <span className="text-2xl">📋</span>
                <p className="text-slate-800 font-semibold text-sm">Report Issue</p>
                <p className="text-slate-400 text-xs">Flag pollution or WASH problems</p>
              </div>
            </Link>
            <Link href="/mobile/vouchers">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2 active:scale-95 transition-transform">
                <span className="text-2xl">🎁</span>
                <p className="text-slate-800 font-semibold text-sm">Rewards</p>
                <p className="text-slate-400 text-xs">{(profile?.total_points ?? 0).toLocaleString()} pts available</p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
