import { Star, Flame, Trophy } from "lucide-react";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/mobile/SignOutButton";
import SettingsMenuClient from "@/components/mobile/SettingsModals";
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

  const username = profileRaw?.username ?? "User";
  const points = profileRaw?.total_points ?? 0;
  const streak = profileRaw?.streak_count ?? 0;
  const level = profileRaw?.level ?? 1;
  const isVenueOwner = profileRaw?.role === "venue_owner" || profileRaw?.role === "admin";

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

  const menuItems = [
    ...(isVenueOwner ? [{
      id: null as null,
      icon: "🏪",
      label: "My Venue",
      href: ownedModule ? `/mobile/venue/${ownedModule.id}` : "/mobile/venue/demo-module",
      hint: ownedModule?.venue_name ?? "Demo Venue",
    }] : []),
    { id: null as null, icon: "🎁", label: "Rewards", href: "/mobile/vouchers", hint: `${points.toLocaleString()} pts` },
    { id: "notifications" as const, icon: "🔔", label: "Notifications", href: null, hint: null },
    { id: "location" as const, icon: "📍", label: "Location & Privacy", href: null, hint: null },
    { id: "appearance" as const, icon: "🌙", label: "Appearance", href: null, hint: null },
    { id: "about" as const, icon: "ℹ️", label: "About WASH360", href: null, hint: null },
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
        {/* Edit profile link */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <Link href="/mobile/account/edit" className="flex items-center gap-4 px-4 py-4 active:bg-slate-50">
            <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-lg">✏️</div>
            <span className="flex-1 font-semibold text-sm text-slate-800">Edit Profile</span>
            <span className="text-slate-300 text-xs">Change name &amp; avatar</span>
          </Link>
        </div>

        {/* Settings menu — client component for modal interactivity */}
        <SettingsMenuClient menuItems={menuItems} />

        <SignOutButton />
        <p className="text-center text-slate-300 text-xs pb-4">WASH360 · v1.0 · Sydney, NSW</p>
      </div>
    </div>
  );
}
