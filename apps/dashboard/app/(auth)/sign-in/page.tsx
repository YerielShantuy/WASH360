"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type View = "sign-in" | "request-access" | "request-sent";

export default function SignInPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("sign-in");

  // Sign-in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Request access state
  const [reqName, setReqName] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [reqOrg, setReqOrg] = useState("");
  const [reqRole, setReqRole] = useState("council");
  const [reqReason, setReqReason] = useState("");
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);

  async function handleRequestAccess(e: React.FormEvent) {
    e.preventDefault();
    setReqLoading(true);
    setReqError(null);

    const res = await fetch("/api/access-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: reqName.trim(),
        email: reqEmail.trim().toLowerCase(),
        organization: reqOrg.trim(),
        role_requested: reqRole,
        reason: reqReason.trim() || null,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setReqError((body as { error?: string }).error ?? "Failed to submit request.");
      setReqLoading(false);
      return;
    }

    setReqLoading(false);
    setView("request-sent");
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError || !data.session) {
      setError(authError?.message ?? "Sign in failed.");
      setLoading(false);
      return;
    }

    // Verify council role
    const { data: profileRaw } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    const profile = profileRaw as { role: string } | null;

    if (profile?.role !== "council" && profile?.role !== "admin") {
      await supabase.auth.signOut();
      setError("This portal is for authorised councils and NGOs only.");
      setLoading(false);
      return;
    }

    router.push("/overview");
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-full bg-[#0284C7] flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
            <span className="text-white font-bold text-3xl">W</span>
          </div>
          <h1 className="text-white text-2xl font-bold tracking-wide">WASH360</h1>
          <p className="text-slate-400 text-sm mt-1">Council / NGO Portal</p>
        </div>

        {/* Sign-in card */}
        {view === "sign-in" && (
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <h2 className="text-slate-900 text-xl font-semibold mb-6">Sign in</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-4" noValidate>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:border-transparent"
                  placeholder="council@example.gov.au"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:border-transparent pr-16"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-medium hover:text-slate-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0284C7] hover:bg-[#0369A1] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors mt-2 min-h-[48px]"
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <p className="text-center text-slate-500 text-xs mt-6">
              Need access?{" "}
              <button
                onClick={() => setView("request-access")}
                className="text-[#0284C7] hover:underline font-medium bg-transparent border-none cursor-pointer p-0"
              >
                Request an account
              </button>
            </p>
          </div>
        )}

        {/* Request access card */}
        {view === "request-access" && (
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setView("sign-in")}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Back to sign in"
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-slate-900 text-xl font-semibold">Request Access</h2>
            </div>

            {reqError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5">
                <p className="text-red-700 text-sm">{reqError}</p>
              </div>
            )}

            <form onSubmit={handleRequestAccess} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full name</label>
                <input
                  type="text"
                  value={reqName}
                  onChange={(e) => setReqName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:border-transparent"
                  placeholder="Jane Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Work email</label>
                <input
                  type="email"
                  value={reqEmail}
                  onChange={(e) => setReqEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:border-transparent"
                  placeholder="jane@council.nsw.gov.au"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Organisation</label>
                <input
                  type="text"
                  value={reqOrg}
                  onChange={(e) => setReqOrg(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:border-transparent"
                  placeholder="Parramatta City Council"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Account type</label>
                <select
                  value={reqRole}
                  onChange={(e) => setReqRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:border-transparent bg-white"
                >
                  <option value="council">Local Council</option>
                  <option value="ngo">NGO / Community Org</option>
                  <option value="researcher">Researcher</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Reason for access{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:border-transparent resize-none"
                  placeholder="Briefly describe how you plan to use the portal…"
                />
              </div>

              <button
                type="submit"
                disabled={reqLoading}
                className="w-full bg-[#0284C7] hover:bg-[#0369A1] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors mt-2 min-h-[48px]"
              >
                {reqLoading ? "Submitting…" : "Submit Request"}
              </button>
            </form>
          </div>
        )}

        {/* Request sent confirmation */}
        {view === "request-sent" && (
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-emerald-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-slate-900 text-xl font-semibold mb-2">Request submitted</h2>
            <p className="text-slate-500 text-sm mb-7">
              An admin will review your request shortly. You will be contacted at your work email once approved.
            </p>
            <button
              onClick={() => setView("sign-in")}
              className="text-sm text-[#0284C7] hover:underline font-medium"
            >
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
