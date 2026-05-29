"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Droplets, Eye, EyeOff, Loader2 } from "lucide-react";

export default function MobileSignInPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    let email = identifier.trim().toLowerCase();

    // If no @ sign, treat as username — look up the email
    if (!email.includes("@")) {
      const { data: emailData, error: rpcError } = await (supabase as any).rpc(
        "get_user_email_by_username",
        { p_username: identifier.trim() }
      );
      if (rpcError || !emailData) {
        setError("No account found with that username.");
        setLoading(false);
        return;
      }
      email = emailData as string;
    }

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.session) {
      setError(authError?.message ?? "Sign in failed. Check your credentials.");
      setLoading(false);
      return;
    }

    // Verify user role (not council/admin — those use the dashboard)
    const { data: profileRaw } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    const profile = profileRaw as { role: string } | null;

    if (profile?.role === "council" || profile?.role === "admin") {
      await supabase.auth.signOut();
      setError("Please use the Council Dashboard to sign in.");
      setLoading(false);
      return;
    }

    router.push("/mobile");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-600 to-sky-800 flex flex-col">
      {/* Header */}
      <div className="flex flex-col items-center pt-20 pb-10 px-6">
        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-4 ring-4 ring-white/30">
          <Droplets size={40} className="text-white" />
        </div>
        <h1 className="text-white font-black text-3xl tracking-tight">WASH360</h1>
        <p className="text-sky-200 text-sm mt-1">Sign in to your account</p>
      </div>

      {/* Card */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-10">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSignIn} className="flex flex-col gap-4">
          <div>
            <label className="block text-slate-700 font-semibold text-sm mb-1.5">Email or Username</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoComplete="username"
              placeholder="you@example.com or your_username"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold text-sm mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 disabled:opacity-60 text-white font-black py-4 rounded-2xl text-base mt-2 flex items-center justify-center gap-2 shadow-lg shadow-sky-200 active:scale-95 transition-transform"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : null}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-6">
          {"Don't have an account? "}
          <Link href="/mobile/sign-up" className="text-sky-600 font-bold">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
