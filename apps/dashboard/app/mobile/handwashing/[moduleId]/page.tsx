"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, Loader2, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { triggerPointsFloat } from "@/components/mobile/PointsFloatOverlay";
import dynamic from "next/dynamic";

const spring = { type: "spring" as const, stiffness: 200, damping: 15 };

// Dynamic import — camera+WASM should not SSR
const HandwashingCamera = dynamic(
  () => import("@/components/mobile/HandwashingCamera"),
  { ssr: false, loading: () => null }
);

// WHO 7-step sequence — used in fallback timer mode
const STEPS = [
  { id: 1, title: "Palm to Palm", desc: "Rub palms together in circular motion", emoji: "🤲", durationSec: 3 },
  { id: 2, title: "Back of Hands", desc: "Interlace fingers and rub the back of each hand", emoji: "🙌", durationSec: 3 },
  { id: 3, title: "Interlaced Fingers", desc: "Interlace fingers and rub palms together", emoji: "🤝", durationSec: 3 },
  { id: 4, title: "Backs of Fingers", desc: "Lock fingers and rub knuckles against opposite palm", emoji: "✊", durationSec: 3 },
  { id: 5, title: "Rotational Thumbs", desc: "Clasp thumb and rotate in circular motion", emoji: "👍", durationSec: 3 },
  { id: 6, title: "Fingertip on Palm", desc: "Rub fingertips in a rotational movement on opposite palm", emoji: "☝️", durationSec: 3 },
  { id: 7, title: "Wrists", desc: "Rub each wrist with the opposite hand", emoji: "💪", durationSec: 3 },
] as const;

type Stage = "nfc" | "camera" | "timer" | "scoring" | "result";

export default function HandwashingPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params.moduleId as string;

  const [stage, setStage] = useState<Stage>("nfc");
  const [score, setScore] = useState(0);
  const [points, setPoints] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);
  const nfcAbortRef = useRef<AbortController | null>(null);

  // Timer-mode state (fallback when camera/ML unavailable)
  const [currentStep, setCurrentStep] = useState(0);
  const [stepTimer, setStepTimer] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(Array(7).fill(false));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef(currentStep);
  stepRef.current = currentStep;

  // ── Timer-mode step loop ──
  useEffect(() => {
    if (stage !== "timer") return;
    setStepTimer(0);
    timerRef.current = setInterval(() => {
      setStepTimer((t) => {
        const required = STEPS[stepRef.current].durationSec;
        if (t + 1 >= required) {
          setCompletedSteps((prev) => {
            const next = [...prev];
            next[stepRef.current] = true;
            return next;
          });
          clearInterval(timerRef.current!);
          setTimeout(() => {
            if (stepRef.current < STEPS.length - 1) {
              setCurrentStep((s) => s + 1);
            } else {
              // All timer steps done — score = 98 (no ML bonus)
              handleScoring(Array(7).fill(true), 98);
            }
          }, 600);
          return required;
        }
        return t + 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [stage, currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scoring + DB submission ──
  const handleScoring = useCallback(
    async (completed: boolean[], rawScore: number) => {
      const earnedPoints = Math.round(rawScore * 1.5);
      setScore(rawScore);
      setPoints(earnedPoints);
      setStage("scoring");
      setSubmitting(true);

      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setSubmitting(false);
          setStage("result");
          return;
        }

        const now = new Date();
        const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();
        const resolvedModuleId = moduleId.startsWith("demo") ? null : moduleId;
        const cooldownModuleId = moduleId.startsWith("demo")
          ? "00000000-0000-0000-0000-000000000000"
          : moduleId;

        // 4-hour cooldown check
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
          duration_seconds: completedCount * 20,
          cooldown_active: false,
        });

        triggerPointsFloat(earnedPoints);

        await (supabase as any).rpc("award_points", {
          p_user_id: session.user.id,
          p_amount: earnedPoints,
          p_source: "handwash",
          p_reference: `handwash-${Date.now()}`,
        });
      } catch {
        // Best-effort — still show result even if DB fails
      }

      setSubmitting(false);
      setStage("result");
    },
    [moduleId]
  );

  // ── Web NFC scan (Chrome Android only) ──
  useEffect(() => {
    if (stage !== "nfc") return;
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
          // If the tag encodes a different module URL, navigate there instead
          const record = event.message?.records?.[0];
          if (record?.recordType === "url" || record?.recordType === "U") {
            try {
              const decoder = new TextDecoder();
              const url = decoder.decode(record.data);
              const match = url.match(/\/handwashing\/([^/?#]+)/);
              if (match && match[1] !== moduleId) {
                router.replace(`/mobile/handwashing/${match[1]}`);
                return;
              }
            } catch {}
          }
          setStage("camera");
        }, { once: true });
      })
      .catch(() => {}); // permission denied or unsupported — silent

    return () => controller.abort();
  }, [stage]);

  // ── Camera ML complete callback ──
  const handleCameraComplete = useCallback(
    (completed: boolean[], mlScore: number) => {
      handleScoring(completed, mlScore);
    },
    [handleScoring]
  );

  // ── NFC / Entry stage ──
  if (stage === "nfc") {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col items-center justify-center px-6 gap-8">
        <button
          onClick={() => router.back()}
          className="absolute top-[calc(env(safe-area-inset-top)+16px)] right-4 w-11 h-11 flex items-center justify-center"
          aria-label="Close"
        >
          <X size={24} className="text-white/60" />
        </button>

        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="w-32 h-32 rounded-full bg-sky-600/20 flex items-center justify-center"
        >
          <div className="w-20 h-20 rounded-full bg-sky-600/40 flex items-center justify-center">
            <Smartphone size={36} className="text-sky-300" />
          </div>
        </motion.div>

        <div className="text-center">
          <h1 className="font-black text-3xl text-white leading-tight mb-2">Ready to Wash?</h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Hold your phone to the NFC module to begin,
            <br />
            or tap below to start with hand-tracking
          </p>
        </div>

        <div className="w-full max-w-xs flex flex-col gap-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            transition={spring}
            onClick={() => setStage("camera")}
            className="w-full h-[56px] rounded-[20px] bg-sky-600 text-white font-black text-lg shadow-[0px_4px_0px_rgba(0,0,0,0.20),0px_8px_20px_rgba(2,132,199,0.40)]"
          >
            Start with Camera 📷
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            transition={spring}
            onClick={() => setStage("timer")}
            className="w-full h-[48px] rounded-[20px] bg-white/10 text-white/80 font-bold text-sm"
          >
            Use Timer Instead
          </motion.button>
          <p className="text-white/30 text-xs text-center">NFC auto-start on Android Chrome</p>
        </div>
      </div>
    );
  }

  // ── Camera ML stage ──
  if (stage === "camera") {
    return (
      <HandwashingCamera
        onComplete={handleCameraComplete}
        onExit={() => router.back()}
        onFallbackToTimer={() => {
          setCurrentStep(0);
          setCompletedSteps(Array(7).fill(false));
          setStage("timer");
        }}
      />
    );
  }

  // ── Timer fallback stage ──
  if (stage === "timer") {
    const step = STEPS[currentStep];
    const progress = stepTimer / step.durationSec;
    const radius = 44;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - progress);

    return (
      <div className="fixed inset-0 bg-slate-900/95 z-[100] flex flex-col">
        {/* Step progress bar */}
        <div
          className="absolute left-4 right-14 flex gap-1.5"
          style={{ top: "calc(env(safe-area-inset-top) + 16px)" }}
        >
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`flex-1 h-1 rounded-full transition-colors ${
                completedSteps[i] ? "bg-amber-400" : i === currentStep ? "bg-white/60" : "bg-white/20"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => router.back()}
          className="absolute right-4 w-11 h-11 flex items-center justify-center z-10"
          style={{ top: "calc(env(safe-area-inset-top) + 8px)" }}
          aria-label="Close"
        >
          <X size={22} className="text-white/60" />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={spring}
            className="flex-1 flex flex-col items-center justify-center px-6 gap-6"
          >
            <div className="w-40 h-40 rounded-[48px] bg-white/10 flex items-center justify-center">
              <span className="text-7xl">{step.emoji}</span>
            </div>

            <div className="text-center">
              <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">
                Step {step.id} of 7
              </p>
              <h2 className="font-black text-2xl text-white mb-2">{step.title}</h2>
              <p className="text-white/60 text-sm leading-relaxed max-w-xs">{step.desc}</p>
            </div>

            {/* Circular countdown */}
            <div className="relative w-24 h-24">
              <svg width="96" height="96" className="-rotate-90">
                <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-black text-2xl text-white">
                  {Math.max(0, step.durationSec - stepTimer)}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-8 left-4 right-4">
          <motion.button
            whileTap={{ scale: 0.96 }}
            transition={spring}
            onClick={() => {
              setCompletedSteps((prev) => {
                const next = [...prev];
                next[currentStep] = true;
                return next;
              });
              clearInterval(timerRef.current!);
              if (currentStep < STEPS.length - 1) {
                setCurrentStep((s) => s + 1);
              } else {
                handleScoring(Array(7).fill(true), 98);
              }
            }}
            className="w-full h-[56px] rounded-[20px] bg-amber-400 text-white font-black text-lg shadow-[0px_4px_0px_rgba(0,0,0,0.15),0px_8px_20px_rgba(245,158,11,0.40)]"
          >
            {currentStep < STEPS.length - 1 ? "Skip to Next Step" : "Finish Washing"}
          </motion.button>
        </div>
      </div>
    );
  }

  // ── Scoring / loading ──
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

  // ── Result ──
  return (
    <div className="fixed inset-0 bg-slate-900/95 z-[100] flex flex-col items-center justify-center px-6 gap-6">
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
                <br />
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
              <h2 className="font-black text-3xl text-white mb-1">Nice wash!</h2>
              <p className="text-white/50 text-sm">WHO 7-step technique scored</p>
            </div>

            {/* Score breakdown */}
            <div className="w-full bg-white/10 rounded-[24px] p-5 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Technique Score</span>
                <span className="font-black text-2xl text-white">{score}/100</span>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${score >= 90 ? "bg-emerald-400" : score >= 70 ? "bg-amber-400" : "bg-sky-400"}`}
                />
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-white/60 text-sm">Steps Detected</span>
                <span className="font-bold text-white">
                  {completedSteps.filter(Boolean).length}/7
                </span>
              </div>
              {score === 100 && (
                <p className="text-amber-400 text-xs font-bold text-center mt-1">
                  🌟 Perfect technique! +2 bonus pts
                </p>
              )}
            </div>

            <div className="bg-emerald-500/20 rounded-[20px] px-6 py-4 w-full text-center">
              <p className="font-black text-3xl text-emerald-400">+{points} pts</p>
              <p className="text-emerald-300/70 text-xs mt-0.5">
                {submitting ? "Saving…" : "Credited to your account"}
              </p>
            </div>
          </>
        )}

        <motion.button
          whileTap={{ scale: 0.96 }}
          transition={spring}
          onClick={() => router.push("/mobile")}
          className="w-full h-[56px] rounded-[20px] bg-sky-600 text-white font-black text-lg shadow-[0px_4px_0px_rgba(0,0,0,0.20),0px_8px_20px_rgba(2,132,199,0.40)]"
        >
          Back to Home
        </motion.button>
      </motion.div>
    </div>
  );
}
