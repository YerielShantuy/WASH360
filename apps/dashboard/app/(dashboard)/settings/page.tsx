import { createServerClient } from "@/lib/supabase-server";
import { User, Shield, Bell, Database } from "lucide-react";
import { AccessRequestManager } from "./AccessRequestManager";

export default async function SettingsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  type ProfileRow = { id: string; username: string; role: string; region: string | null; created_at: string };
  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("id, username, role, region, created_at")
    .eq("id", user!.id)
    .single();

  const profile = rawProfile as ProfileRow | null;
  const isAdmin = profile?.role === "admin";

  // Fetch pending access request count (admin only)
  let pendingCount = 0;
  if (isAdmin) {
    const { count } = await supabase
      .from("access_requests" as never)
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  return (
    <div className="p-8 space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Account and portal configuration</p>
      </div>

      {/* Account info */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
            <User size={16} className="text-sky-600" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">Account</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Username</p>
              <p className="text-slate-800 font-medium">{profile?.username ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Email</p>
              <p className="text-slate-800 font-medium">{user?.email ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Role</p>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                profile?.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-sky-100 text-sky-700"
              }`}>
                {profile?.role ?? "council"}
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Region</p>
              <p className="text-slate-800 font-medium">{profile?.region ?? "Not set"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Member Since</p>
              <p className="text-slate-800">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Shield size={16} className="text-emerald-600" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">Security</h2>
        </div>
        <div className="px-6 py-5 space-y-3 text-sm text-slate-600">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <p className="font-medium text-slate-700">Password</p>
              <p className="text-xs text-slate-400 mt-0.5">Last changed: unknown</p>
            </div>
            <button className="text-sm text-sky-600 hover:text-sky-700 font-medium px-3 py-1.5 rounded-lg border border-sky-200 hover:bg-sky-50 transition-colors">
              Change password
            </button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-slate-700">Two-Factor Authentication</p>
              <p className="text-xs text-slate-400 mt-0.5">Recommended for council accounts</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
              Not configured
            </span>
          </div>
        </div>
      </div>

      {/* Data & API */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <Database size={16} className="text-amber-600" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">Data Export</h2>
        </div>
        <div className="px-6 py-5 space-y-3 text-sm">
          <p className="text-slate-500">
            Export anonymised environmental data for your council area. All exports include only
            coarsened location data (500m grid) and no personally identifiable information.
          </p>
          <div className="flex gap-3 pt-1">
            <a
              href="/water-quality?export=csv"
              className="text-sm text-sky-600 hover:text-sky-700 font-medium px-3 py-1.5 rounded-lg border border-sky-200 hover:bg-sky-50 transition-colors"
            >
              Water Quality CSV
            </a>
            <a
              href="/trash?export=csv"
              className="text-sm text-sky-600 hover:text-sky-700 font-medium px-3 py-1.5 rounded-lg border border-sky-200 hover:bg-sky-50 transition-colors"
            >
              Trash Submissions CSV
            </a>
            <a
              href="/reports?export=csv"
              className="text-sm text-sky-600 hover:text-sky-700 font-medium px-3 py-1.5 rounded-lg border border-sky-200 hover:bg-sky-50 transition-colors"
            >
              Drain Reports CSV
            </a>
          </div>
        </div>
      </div>

      {/* Admin: Access request management */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <Bell size={16} className="text-purple-600" />
              </div>
              <h2 className="text-base font-semibold text-slate-800">Access Requests</h2>
            </div>
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold bg-red-500 text-white rounded-full">
                {pendingCount}
              </span>
            )}
          </div>
          <AccessRequestManager />
        </div>
      )}
    </div>
  );
}
