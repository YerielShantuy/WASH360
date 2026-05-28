"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, MapPin, Camera, CheckCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

const REPORT_TYPES = [
  { id: "illegal_dumping", label: "Illegal Dumping", emoji: "🗑️", dbType: "clogged_drain" as const },
  { id: "clogged_drain", label: "Clogged Drain", emoji: "🚰", dbType: "clogged_drain" as const },
  { id: "broken_tap", label: "Broken Tap", emoji: "💧", dbType: "clogged_drain" as const },
  { id: "open_defecation", label: "Open Defecation", emoji: "⚠️", dbType: "clogged_drain" as const },
  { id: "flood_risk", label: "Flood Risk", emoji: "🌊", dbType: "flood" as const },
  { id: "other", label: "Other Issue", emoji: "📝", dbType: "clogged_drain" as const },
];

const SEVERITY_OPTIONS = ["low", "medium", "high"] as const;

type Stage = "form" | "submitting" | "done";

export default function ReportPage() {
  const [stage, setStage] = useState<Stage>("form");
  const [type, setType] = useState<string | null>(null);
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const selected = REPORT_TYPES.find((r) => r.id === type);
    if (!selected) return;

    setStage("submitting");
    setError(null);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Not signed in."); setStage("form"); return; }

    const { error: insertError } = await (supabase as any).from("drain_reports").insert({
      user_id: session.user.id,
      report_type: selected.dbType,
      severity,
      description: `[${selected.label}] ${desc}`.trim(),
      photo_path: "web-demo/placeholder.jpg",
      location: null,
      status: "pending",
    });

    if (insertError) { setError(insertError.message); setStage("form"); return; }

    // Award points
    await (supabase as any).rpc("award_points", {
      p_user_id: session.user.id,
      p_amount: 50,
      p_source: "report",
      p_reference: `report-${Date.now()}`,
    });

    setStage("done");
  }

  if (stage === "done") {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-6 text-center gap-4 pt-20">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
          <CheckCircle size={44} className="text-emerald-500" />
        </div>
        <h2 className="text-slate-900 font-black text-2xl">Report Submitted!</h2>
        <p className="text-slate-500 text-sm leading-relaxed">The council will review your report shortly.</p>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-4 w-full max-w-xs">
          <p className="text-emerald-700 font-black text-xl">+50 pts</p>
          <p className="text-emerald-600 text-xs">Credited to your account</p>
        </div>
        <Link href="/mobile">
          <button className="bg-sky-600 text-white font-bold px-8 py-3 rounded-xl text-sm mt-2">Back to Home</button>
        </Link>
      </div>
    );
  }

  if (stage === "submitting") {
    return (
      <div className="flex flex-col items-center justify-center min-h-full gap-4">
        <Loader2 size={44} className="text-sky-500 animate-spin" />
        <p className="text-slate-500 text-sm font-medium">Submitting your report...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white border-b border-slate-100 px-4 pb-4 pt-10 flex items-center gap-3">
        <Link href="/mobile" className="p-1 -ml-1"><ChevronLeft size={24} className="text-slate-700" /></Link>
        <h1 className="text-slate-900 font-black text-xl">Report an Issue</h1>
      </div>

      <div className="flex flex-col gap-5 p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Type selector */}
        <section>
          <p className="text-slate-700 font-bold text-sm mb-3">What are you reporting?</p>
          <div className="grid grid-cols-3 gap-2">
            {REPORT_TYPES.map((rt) => (
              <button
                key={rt.id}
                onClick={() => setType(rt.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all active:scale-95 ${type === rt.id ? "bg-sky-600 border-sky-600 shadow-md" : "bg-white border-slate-100 shadow-sm"}`}
              >
                <span className="text-2xl">{rt.emoji}</span>
                <span className={`text-xs font-semibold text-center leading-tight ${type === rt.id ? "text-white" : "text-slate-600"}`}>{rt.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Severity */}
        <section>
          <p className="text-slate-700 font-bold text-sm mb-2">Severity</p>
          <div className="flex gap-2">
            {SEVERITY_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSeverity(s)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold capitalize transition-colors ${severity === s ? s === "high" ? "bg-red-500 text-white" : s === "medium" ? "bg-amber-500 text-white" : "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* Location */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <MapPin size={18} className="text-sky-500 flex-none" />
          <div>
            <p className="text-slate-800 font-semibold text-sm">Current Location</p>
            <p className="text-slate-400 text-xs">Jakarta, Indonesia (GPS)</p>
          </div>
          <span className="ml-auto text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Live</span>
        </div>

        {/* Description */}
        <div>
          <p className="text-slate-700 font-bold text-sm mb-2">Description <span className="font-normal text-slate-400">(optional)</span></p>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Describe the issue in detail..."
            rows={3}
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-sm placeholder:text-slate-300 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 resize-none"
          />
        </div>

        {/* Photo placeholder */}
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-6 flex flex-col items-center gap-2">
          <Camera size={28} className="text-slate-300" />
          <p className="text-slate-400 text-sm font-medium">Add a photo</p>
          <p className="text-slate-300 text-xs">Photo upload coming soon</p>
        </div>

        <button
          onClick={submit}
          disabled={!type}
          className={`w-full py-4 rounded-2xl font-black text-base transition-all ${type ? "bg-sky-600 text-white shadow-lg shadow-sky-200 active:scale-95" : "bg-slate-100 text-slate-300 cursor-not-allowed"}`}
        >
          Submit Report · +50 pts
        </button>
      </div>
    </div>
  );
}
