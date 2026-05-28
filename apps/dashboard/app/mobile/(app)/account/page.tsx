import { Star, Flame, Trophy, Gift, Bell, MapPin, Moon, Info, ChevronRight, Store } from "lucide-react";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/mobile/SignOutButton";
import type { ProfileRow, ModuleRow } from "@/lib/db.types";

export default async function AccountPage() {
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/mobile/sign-in");

  const db = supabase as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const { data: profileRaw } = await db
    .from("profiles")
    .select("username, total_points, streak_count, level, role")
    .eq("id", session.user.id)
    .single() as { data: Pick<ProfileRow, "username" | "total_points" | "streak_count" | "level" | "role"> | null };

  const profile = profileRaw;
  const username = profile?.username ?? "User";
  const points = profile?.total_points ?? 0;
  const streak = profile?.streak_count ?? 0;
  const level = profile?.level ?? 1;
  const isVenueOwner = profile?.role === "venue_owner" || profile?.role === "admin";

  // Fetch owned modules if venue_owner
  let ownedModule: Pick<ModuleRow, "id" | "venue_name"> | null = null;
  if (isVenueOwner) {
    const { data: ownership } = await db
      .from("module_owners")
      .select("module_id")
      .eq("user_id", session.user.id)
      .limit(1)
      .maybeSingle() as { data: { module_id: string } | null };

    if (ownership) {
      const { data: mod } = await db
        .from("modules")
        .select("id, venue_name")
        .eq("id", ownership.module_id)
        .maybeSingle() as { data: Pick<ModuleRow, "id" | "venue_name"> | null };
      ownedModule = mod;
    }
  }

  const MENU = [
    ...(isVenueOwner ? [{
      icon: Store,
      label: "My Venue",
      href: ownedModule ? `/mobile/venue/${ownedModule.id}` : "/mobile/venue/demo-module",
      hint: ownedModule?.venue_name ?? "Demo Venue",
      highlight: true,
    }] : []),
    { icon: Gift, label: "Rewards", href: "/mobile/vouchers", hint: `${points.toLocaleString()} pts`, highlight: false },
    { icon: Bell, label: "Notifications", href: null, hint: null, highlight: false },
    { icon: MapPin, label: "Location & Privacy", href: null, hint: null, highlight: false },
    { icon: Moon, label: "Appearance", href: null, hint: null, highlight: false },
    { icon: Info, label: "About WASH360", href: null, hint: null, highlight: false },
  ];

  return (
    <div className="flex flex-col min-h-full bg-[#F0F9FF]">
      {/* Profile header */}
      <div className="bg-sky-600 pt-12 pb-8 px-5 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center ring-2 ring-white/40">
            <span className="text-white font-black text-2xl">{username[0]?.toUpperCase() ?? "U"}</span>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-black">{username}</h1>
            <p className="text-sky-200 text-sm">{session.user.email}</p>
            {isVenueOwner && (
              <span className="inline-block mt-1 bg-amber-400/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                Venue Owner
              </span>
            )}
          </div>
          <div className="bg-amber-400 rounded-full px-3 py-1">
            <span className="text-white font-black text-sm">Lv {level}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { icon: Star, label: "Points", value: points.toLocaleString(), color: "text-yellow-300" },
            { icon: Flame, label: "Streak", value: `${streak}d`, color: "text-orange-300" },
            { icon: Trophy, label: "Level", value: `${level}`, color: "text-amber-300" },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 rounded-2xl p-3 text-center">
              <s.icon size={16} className={`${s.color} mx-auto mb-1`} />
              <p className="text-white font-black text-lg leading-none">{s.value}</p>
              <p className="text-sky-200 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {MENU.map((item, i) => (
            <div key={item.label}>
              {i > 0 && <div className="h-px bg-slate-50 ml-14" />}
              {item.href ? (
                <Link
                  href={item.href}
                  className={`flex items-center gap-4 px-4 py-4 active:bg-slate-50 ${item.highlight ? "bg-sky-50/50" : ""}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.highlight ? "bg-sky-100" : "bg-sky-50"}`}>
                    <item.icon size={18} className={item.highlight ? "text-sky-700" : "text-sky-600"} />
                  </div>
                  <span className={`flex-1 font-semibold text-sm ${item.highlight ? "text-sky-800" : "text-slate-800"}`}>{item.label}</span>
                  {item.hint && (
                    <span className="text-sky-600 text-xs font-bold bg-sky-50 px-2 py-0.5 rounded-full">{item.hint}</span>
                  )}
                  <ChevronRight size={16} className="text-slate-300" />
                </Link>
              ) : (
                <div className="flex items-center gap-4 px-4 py-4">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center">
                    <item.icon size={18} className="text-slate-400" />
                  </div>
                  <span className="flex-1 text-slate-500 font-semibold text-sm">{item.label}</span>
                  <ChevronRight size={16} className="text-slate-200" />
                </div>
              )}
            </div>
          ))}
        </div>

        <SignOutButton />
        <p className="text-center text-slate-300 text-xs pb-4">WASH360 · v1.0</p>
      </div>
    </div>
  );
}
