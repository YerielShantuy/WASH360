"use client";
import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { triggerPointsFloat } from "@/components/mobile/PointsFloatOverlay";
import dynamic from "next/dynamic";

const spring = { type: "spring" as const, stiffness: 200, damping: 15 };

// Daily-streak camera (front/back flip allowed)
const HandwashingCamera = dynamic(
  () => import("@/components/mobile/HandwashingCamera"),
  { ssr: false, loading: () => <LoadingScreen msg="Starting camera…" /> }
);

// Hardware-relay module session (back camera, relay steps)
const ModuleHandwashSession = dynamic(
  () => import("@/components/mobile/ModuleHandwashSession"),
  { ssr: false, loading: () => <LoadingScreen msg="Connecting to module…" /> }
);

function LoadingScreen({ msg }: { msg: string }) {
  return (
    <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col items-center justify-center gap-4">
      <Loader2 size={48} className="text-sky-400 animate-spin" />
      <p className="text-white/60 text-sm font-medium">{msg}</p>
    </div>
  );
}

type Stage = "session" | "scoring" | "result";

const WHO_STEP_LABELS = [
  "Palm to Palm", "Fingers Interlaced", "Palm over Back",
  "Backs of Fingers", "Rotational Thumbs", "Fingertips on Palm", "Wrists",
];

export default function HandwashingPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params.moduleId as string;

  // "demo-module" = daily streak (front/back flip, no hardware)
  // real UUID     = module session (back camera, relay, NFC)
  const isStreak = moduleId === "demo-module";

  const [stage, setStage] = useState<Stage>("session");
  const [score, setScore] = useState(0);
  const [points, setPoints] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(Array(7).fill(false));
  const [latherSec, setLatherSec] = useState(0);
  const [cooldownActive, setCooldownActive] = useState(false);
  const nfcAbortRef = useRef<AbortController | null>(null);

  // NFC silent scan — auto-redirects if a different module tag is scanned
  useEffect(() => {
    if (stage !== "session" || isStreak) return;
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
          try {
            const url = new TextDecoder().decode(event.message?.records?.[0]?.data ?? new Uint8Array());
            const match = url.match(/\/handwashing\/([^/?#]+)/);
            if (match && match[1] !== moduleId) {
              router.replace(`/mobile/handwashing/${match[1]}`);
            }
          } catch {}
        }, { once: true });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [stage, isStreak, moduleId, router]);

  const handleComplete = useCallback(
    async (completed: boolean[], rawScore: number, latheringMs: number) => {
      const earnedPoints = Math.round(rawScore * 1.5);
      setScore(rawScore);
      setPoints(earnedPoints);
      setCompletedSteps(completed);
      setLatherSec(Math.floor(latheringMs / 1000));
      setStage("scoring");

      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setStage("result"); return; }

        const now = new Date();
        const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();
        const cooldownId = isStreak ? "00000000-0000-0000-0000-000000000000" : moduleId;

        const { data: recent } = await (supabase as any)
          .from("handwash_sessions")
          .select("id")
          .eq("user_id", session.user.id)
          .eq("module_id", cooldownId)
          .gte("created_at", fourHoursAgo)
          .limit(1) as { data: { id: string }[] | null };

        if (recent && recent.length > 0) {
          setCooldownActive(true);
          setStage("result");
          return;
        }

        await (supabase as any).from("handwash_sessions").insert({
          user_id: session.user.id,
          module_id: isStreak ? null : moduleId,
          technique_score: rawScore,
          total_points: earnedPoints,
          session_type: isStreak ? "streak" : "module",
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

      setStage("result");
    },
    [moduleId, isStreak]
  );

  // ── Session stage ──
  if (stage === "session") {
    if (isStreak) {
      return (
        <HandwashingCamera
          onComplete={handleComplete}
          onExit={() => router.push("/mobile")}
          allowCameraFlip={true}
          facingMode="user"
        />
      );
    }
    return (
      <ModuleHandwashSession
        moduleId={moduleId}
        onComplete={handleComplete}
        onExit={() => router.push("/mobile")}
      />
    );
  }

  // ── Scoring / saving ──
  if (stage === "scoring") {
    return (
      <div className="fixed inset-0 bg-slate-900/95 z-[100] flex flex-col items-center justify-center gap-4">
        <Loader2 size={48} className="text-sky-400 animate-spin" />
        <p className="text-white/60 text-sm font-medium">Saving your session…</p>
      </div>
    );
  }

  // ── Result ──
  return (
    <div className="fixed inset-0 bg-slate-900/95 z-[100] overflow-y-auto">
      <div className="flex flex-col items-center px-6 py-12 gap-6 min-h-full justify-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={spring}
          className="flex flex-col items-center gap-6 w-full max-w-sm"
        >
          <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle size={52} className="text-emerald-400" />
          </div>
          <div className="text-center">
            <h2 className="font-black text-3xl text-white mb-1">
              {score >= 90 ? "Perfect! 🎉" : score >= 60 ? "Great job! 👏" : "Good start! 💧"}
            </h2>
            <p className="text-white/50 text-sm">{latherSec}s lathering time</p>
          </div>

          {/* Score ring */}
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

          {cooldownActive ? (
            <div className="bg-amber-500/20 border border-amber-500/30 rounded-2xl px-6 py-3 text-center w-full">
              <p className="text-amber-300 font-bold text-sm">⏳ Cooldown Active</p>
              <p className="text-amber-400/70 text-xs mt-1">Points already earned from this module in the last 4 hours. Come back later!</p>
            </div>
          ) : (
            <div className="bg-amber-400/20 border border-amber-400/30 rounded-2xl px-8 py-3 text-center">
              <p className="text-amber-300 font-black text-2xl">+{points} pts</p>
              <p className="text-amber-400/60 text-xs">Credited to your account</p>
            </div>
          )}

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

          <motion.button
            whileTap={{ scale: 0.96 }} transition={spring}
            onClick={() => router.push("/mobile")}
            className="w-full h-[54px] rounded-[20px] bg-white/10 text-white font-black text-base border border-white/10"
          >
            Done
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
