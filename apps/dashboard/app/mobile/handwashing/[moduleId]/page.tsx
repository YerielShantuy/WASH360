"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { triggerPointsFloat } from "@/components/mobile/PointsFloatOverlay";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const spring = { type: "spring" as const, stiffness: 200, damping: 15 };

const HandwashingCamera = dynamic(
  () => import("@/components/mobile/HandwashingCamera"),
  { ssr: false, loading: () => null }
);

type Stage = "camera" | "scoring" | "result";

function HandwashingContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduleId = params.moduleId as string;

  const [stage, setStage] = useState<Stage>("camera");
  const [score, setScore] = useState(0);
  const [points, setPoints] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(Array(7).fill(false));
  const [latherSec, setLatherSec] = useState(0);
  const nfcAbortRef = useRef<AbortController | null>(null);

  // NFC Web API — silent background scan while on camera screen
  useEffect(() => {
    if (stage !== "camera") return;
    if (typeof window === "undefined") return;
    const NDEFReader = (window as any).NDEFReader; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!NDEFReader) return;

    const controller = new AbortController();
    nfcAbortRef.current = controller;

    const reader = new NDEFReader();
    reader.scan({ signal: controller.signal })
      .then(() => {
        reader.addEventListener("reading", (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          controller.abort();
          // If tag encodes a different module, navigate there
          const record = event.message?.records?.[0];
          if (record?.recordType === "url" || record?.recordType === "U") {
            try {
              const url = new TextDecoder().decode(record.data);
              const match = url.match(/\/handwashing\/([^/?#]+)/);
              if (match && match[1] !== moduleId) {
                router.replace(`/mobile/handwashing/${match[1]}`);
                return;
              }
            } catch {}
          }
          // Same module — already on camera, nothing to do
        }, { once: true });
      })
      .catch(() => {});

    return () => controller.abort();
  }, [stage, moduleId, router]);

  const handleComplete = useCallback(
    async (completed: boolean[], rawScore: number, latheringMs: number) => {
      const earnedPoints = Math.round(rawScore * 1.5);
      setScore(rawScore);
      setPoints(earnedPoints);
      setCompletedSteps(completed);
      setLatherSec(Math.floor(latheringMs / 1000));
      setStage("scoring");
      setSubmitting(true);

      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) { setSubmitting(false); setStage("result"); return; }

        const now = new Date();
        const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();
        const resolvedModuleId = moduleId.startsWith("demo") ? null : moduleId;
        const cooldownModuleId = moduleId.startsWith("demo")
          ? "00000000-0000-0000-0000-000000000000"
          : moduleId;

        const { data: recent } = await (supabase as any)
          .from("handwash_sessions")
          .select("id")
          .eq("user_id", session.user.id)
          .eq("module_id", cooldownModuleId)
          .gte("created_at", fourHoursAgo)
          .limit(1) as { data: { id: string }[] | null };

        if (recent && recent.length > 0) {
          setCooldownActive(true);
          setSubmitting(false);
          setStage("result");
          return;
        }

        const completedCount = completed.filter(Boolean).length;

        await (supabase as any).from("handwash_sessions").insert({
          user_id: session.user.id,
          module_id: resolvedModuleId,
          technique_score: rawScore,
          coverage_score: null,
          total_points: earnedPoints,
          session_type: "module",
          duration_seconds: Math.floor(latheringMs / 1000),
          cooldown_active: false,
        });

        triggerPointsFloat(earnedPoints);

        await (supabase as any).rpc("award_points", {
          p_user_id: session.user.id,
          p_amount: earnedPoints,
          p_source: "handwash",
          p_reference: `handwash-${Date.now()}`,
        });
      } catch {}

      setSubmitting(false);
      setStage("result");
    },
    [moduleId]
  );

  // Camera stage — full screen, starts immediately
  if (stage === "camera") {
    return (
      <HandwashingCamera
        onComplete={handleComplete}
        onExit={() => router.back()}
      />
    );
  }

  // Scoring / saving
  if (stage === "scoring") {
    return (
      <div className="fixed inset-0 bg-slate-900/95 z-[100] flex flex-col items-center justify-center gap-4">
        <Loader2 size={48} className="text-sky-400 animate-spin" />
        <p className="text-white/60 text-sm font-medium">
          {submitting ? "Saving your session…" : "Calculating your score…"}
        </p>
      </div>
    );
  }

  // Result
  const WHO_STEP_LABELS = [
    "Palm to Palm", "Fingers Interlaced", "Palm over Back",
    "Backs of Fingers", "Rotational Thumbs", "Fingertips on Palm", "Wrists",
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/95 z-[100] overflow-y-auto">
      <div className="flex flex-col items-center px-6 py-12 gap-6 min-h-full justify-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={spring}
          className="flex flex-col items-center gap-6 w-full max-w-sm"
        >
          {cooldownActive ? (
            <>
              <div className="w-24 h-24 rounded-full bg-amber-500/20 flex items-center justify-center">
                <span className="text-5xl">⏳</span>
              </div>
              <div className="text-center">
                <h2 className="font-black text-2xl text-white mb-2">Cooldown Active</h2>
                <p className="text-white/60 text-sm leading-relaxed">
                  You can use this module again in 4 hours.
                  Great job staying hygienic!
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle size={52} className="text-emerald-400" />
              </div>
              <div className="text-center">
                <h2 className="font-black text-3xl text-white mb-1">
                  {score >= 90 ? "Perfect! 🎉" : score >= 60 ? "Great job! 👏" : "Good start! 💧"}
                </h2>
                <p className="text-white/50 text-sm">{latherSec}s lathering time</p>
              </div>

              {/* Score circle */}
              <div className="relative w-32 h-32">
                <svg width="128" height="128" className="-rotate-90">
                  <circle cx="64" cy="64" r="56" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  <circle
                    cx="64" cy="64" r="56" fill="none"
                    stroke={score >= 90 ? "#10B981" : score >= 60 ? "#F59E0B" : "#38bdf8"}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - score / 100)}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="font-black text-3xl text-white leading-none">{score}</p>
                  <p className="text-white/40 text-xs">/ 100</p>
                </div>
              </div>

              {/* Points badge */}
              <div className="bg-amber-400/20 border border-amber-400/30 rounded-2xl px-8 py-3 text-center">
                <p className="text-amber-300 font-black text-2xl">+{points} pts</p>
                <p className="text-amber-400/60 text-xs">Credited to your account</p>
              </div>

              {/* Step breakdown */}
              <div className="w-full bg-white/5 rounded-2xl p-4 grid grid-cols-2 gap-2">
                {WHO_STEP_LABELS.map((label, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-none ${completedSteps[i] ? "bg-emerald-500" : "bg-white/10"}`}>
                      {completedSteps[i] && <CheckCircle size={10} className="text-white" />}
                    </div>
                    <span className={`text-xs leading-tight ${completedSteps[i] ? "text-white/80" : "text-white/30"}`}>{label}</span>
                  </div>
                ))}
              </div>

              {score === 100 && (
                <p className="text-emerald-400 font-bold text-sm text-center">
                  🏆 Perfect technique — all 7 WHO steps completed!
                </p>
              )}
            </>
          )}

          <motion.button
            whileTap={{ scale: 0.96 }} transition={spring}
            onClick={() => router.back()}
            className="w-full h-[54px] rounded-[20px] bg-white/10 text-white font-black text-base border border-white/10"
          >
            Done
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

export default function HandwashingPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-slate-900 z-[100] flex items-center justify-center">
        <Loader2 size={36} className="text-sky-400 animate-spin" />
      </div>
    }>
      <HandwashingContent />
    </Suspense>
  );
}
