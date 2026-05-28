"use client";

/**
 * Full hardware-connected handwash session flow:
 *
 * DETECT_HAND → hand in top-right corner detected
 * PUMP        → pump ON 3 s, countdown, pump OFF
 * LATHER      → WHO AI scoring (back camera), user taps Finish
 * DETECT_RINSE→ "move hands away" — detect hands gone from frame
 * UV_SCORE    → UV light ON, glow tracking 5 s, UV light OFF
 * DONE        → calls onComplete with final score
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { createHandwashScorer, HAND_CONNECTIONS, type Landmark } from "@/lib/handwash-scorer";
import { setRelay } from "@/lib/relay";

const spring = { type: "spring" as const, stiffness: 200, damping: 15 };

const MEDIAPIPE_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915";

const WHO_STEPS = [
  "Palm to Palm", "Fingers Interlaced", "Palm over Back",
  "Backs of Fingers", "Rotational Thumbs", "Fingertips on Palm", "Wrists",
];

declare global {
  interface Window {
    Hands: new (config: { locateFile: (f: string) => string }) => MediaPipeHands;
  }
}
interface MediaPipeHands {
  setOptions(o: { maxNumHands?: number; modelComplexity?: 0 | 1; minDetectionConfidence?: number; minTrackingConfidence?: number }): void;
  onResults(cb: (r: MediaPipeResults) => void): void;
  send(i: { image: HTMLVideoElement }): Promise<void>;
  close(): void;
}
interface MediaPipeResults {
  multiHandLandmarks?: Landmark[][];
  image: CanvasImageSource;
}

export type SessionStage =
  | "loading"         // camera + mediapipe initialising
  | "detect_hand"     // waiting for hand in top-right corner
  | "pump_countdown"  // pump on, 3-2-1 countdown
  | "lather"          // free-form WHO detection
  | "detect_rinse"    // waiting for hands to leave frame
  | "uv_score"        // UV light on, 5-second glow scoring
  | "error";

interface Props {
  moduleId: string;
  onComplete: (completedSteps: boolean[], score: number, latheringMs: number) => void;
  onExit: () => void;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const el = document.createElement("script");
    el.src = src;
    el.crossOrigin = "anonymous";
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(el);
  });
}

/** Returns true when a hand wrist (landmark 0) is in the top-right 25% of frame */
function handInTopRight(allHands: Landmark[][]): boolean {
  if (!allHands.length) return false;
  for (const hand of allHands) {
    const wrist = hand[0];
    if (wrist.x > 0.65 && wrist.y < 0.35) return true;
  }
  return false;
}

/** Returns true when no hands are visible */
function handsGone(allHands: Landmark[][]): boolean {
  return allHands.length === 0;
}

export default function ModuleHandwashSession({ moduleId, onComplete, onExit }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<MediaPipeHands | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runningRef = useRef(true);
  const lastTimeRef = useRef(0);
  const scorerRef = useRef(createHandwashScorer());

  // Refs for stable handleResults
  const stageRef = useRef<SessionStage>("loading");
  const stepProgressRef = useRef<number[]>(Array(7).fill(0));
  const scoredRef = useRef<boolean[]>(Array(7).fill(false));
  const latheringMsRef = useRef(0);
  const detectHoldRef = useRef(0);   // ms hand held in top-right corner
  const rinseHoldRef = useRef(0);    // ms hands absent from frame
  const uvHoldRef = useRef(0);       // ms in UV scoring phase
  const lastUiRef = useRef(0);

  // UI state
  const [stage, setStage] = useState<SessionStage>("loading");
  const [loadingMsg, setLoadingMsg] = useState("Starting camera…");
  const [pumpCountdown, setPumpCountdown] = useState(3);
  const [stepProgress, setStepProgress] = useState<number[]>(Array(7).fill(0));
  const [scored, setScored] = useState<boolean[]>(Array(7).fill(false));
  const [latheringMs, setLatheringMs] = useState(0);
  const [handsVisible, setHandsVisible] = useState(false);
  const [newlyScored, setNewlyScored] = useState<number | null>(null);
  const [uvProgress, setUvProgress] = useState(0);
  const [detectProgress, setDetectProgress] = useState(0); // 0-1 for hand corner hold
  const [finishing, setFinishing] = useState(false);

  const UV_DURATION_MS = 5000;
  const DETECT_HOLD_MS = 1500; // hold hand in corner for 1.5 s

  const transitionStage = useCallback((next: SessionStage) => {
    stageRef.current = next;
    setStage(next);
  }, []);

  const handleResults = useCallback((results: MediaPipeResults) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const now = performance.now();
    const deltaMs = lastTimeRef.current ? Math.min(now - lastTimeRef.current, 100) : 16;
    lastTimeRef.current = now;

    const allHands: Landmark[][] = results.multiHandLandmarks ?? [];
    const currentStage = stageRef.current;

    // ── Draw camera frame ──
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentStage === "uv_score") {
      // UV glow effect — tint frame green/purple
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(100, 20, 200, 0.25)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Neon skeleton
      for (const hand of allHands) {
        ctx.strokeStyle = "#a855f7"; // purple glow
        ctx.lineWidth = 3;
        ctx.shadowColor = "#a855f7";
        ctx.shadowBlur = 12;
        for (const [a, b] of HAND_CONNECTIONS) {
          ctx.beginPath();
          ctx.moveTo(hand[a].x * canvas.width, hand[a].y * canvas.height);
          ctx.lineTo(hand[b].x * canvas.width, hand[b].y * canvas.height);
          ctx.stroke();
        }
        for (const lm of hand) {
          ctx.beginPath();
          ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 6, 0, Math.PI * 2);
          ctx.fillStyle = "#e879f9"; // fuchsia
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }
    } else {
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      // Normal skeleton
      for (const hand of allHands) {
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2.5;
        for (const [a, b] of HAND_CONNECTIONS) {
          ctx.beginPath();
          ctx.moveTo(hand[a].x * canvas.width, hand[a].y * canvas.height);
          ctx.lineTo(hand[b].x * canvas.width, hand[b].y * canvas.height);
          ctx.stroke();
        }
        for (const lm of hand) {
          ctx.beginPath();
          ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 5, 0, Math.PI * 2);
          ctx.fillStyle = "#fbbf24";
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }

    // ── Stage-specific logic ──
    if (currentStage === "detect_hand") {
      const inCorner = handInTopRight(allHands);
      if (inCorner) {
        detectHoldRef.current += deltaMs;
        if (detectHoldRef.current >= DETECT_HOLD_MS) {
          detectHoldRef.current = 0;
          transitionStage("pump_countdown");
          // Fire pump relay
          setRelay(moduleId, { pump: true, uv_light: false }).catch(() => {});
        }
      } else {
        detectHoldRef.current = Math.max(0, detectHoldRef.current - deltaMs * 0.5);
      }
      setDetectProgress(Math.min(detectHoldRef.current / DETECT_HOLD_MS, 1));
    }

    if (currentStage === "lather") {
      const state = scorerRef.current.processFrame(allHands, deltaMs);
      stepProgressRef.current = state.stepProgress;
      latheringMsRef.current = state.latheringMs;
      state.scored.forEach((s, i) => {
        if (s && !scoredRef.current[i]) setNewlyScored(i);
      });
      scoredRef.current = state.scored;
    }

    if (currentStage === "detect_rinse") {
      const gone = handsGone(allHands);
      if (gone) {
        rinseHoldRef.current += deltaMs;
        if (rinseHoldRef.current >= 1000) {
          rinseHoldRef.current = 0;
          transitionStage("uv_score");
          setRelay(moduleId, { pump: false, uv_light: true }).catch(() => {});
          uvHoldRef.current = 0;
        }
      } else {
        rinseHoldRef.current = 0;
      }
    }

    if (currentStage === "uv_score") {
      uvHoldRef.current += deltaMs;
      const progress = Math.min(uvHoldRef.current / UV_DURATION_MS, 1);
      setUvProgress(progress);
      if (uvHoldRef.current >= UV_DURATION_MS) {
        transitionStage("loading"); // prevent further updates
        setRelay(moduleId, { pump: false, uv_light: false }).catch(() => {});
        const finalScore = scorerRef.current.getScore();
        const steps = scorerRef.current.getScoredSteps();
        const ms = scorerRef.current.getLatheringMs();
        onComplete(steps, finalScore, ms);
        return;
      }
    }

    // Batch UI updates at ~10fps
    if (now - lastUiRef.current > 100) {
      lastUiRef.current = now;
      setHandsVisible(allHands.length > 0);
      if (currentStage === "lather") {
        setStepProgress([...stepProgressRef.current]);
        setScored([...scoredRef.current]);
        setLatheringMs(latheringMsRef.current);
      }
    }
  }, [moduleId, onComplete, transitionStage]);

  // Camera + MediaPipe init (run once)
  useEffect(() => {
    async function init() {
      try {
        setLoadingMsg("Starting camera…");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } },
        });
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video || !runningRef.current) return;
        video.srcObject = stream;
        await video.play();
        const canvas = canvasRef.current;
        if (canvas) { canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480; }

        setLoadingMsg("Loading hand tracking…");
        await loadScript(`${MEDIAPIPE_CDN}/hands.js`);
        let polls = 0;
        while (!window.Hands && polls < 30) { await new Promise((r) => setTimeout(r, 200)); polls++; }
        if (!window.Hands) throw new Error("MediaPipe not found");

        const hands = new window.Hands({ locateFile: (f) => `${MEDIAPIPE_CDN}/${f}` });
        hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.5 });
        hands.onResults(handleResults);
        handsRef.current = hands;

        transitionStage("detect_hand");

        async function loop() {
          if (!runningRef.current || !handsRef.current || !videoRef.current) return;
          if (videoRef.current.readyState >= 2) {
            try { await handsRef.current.send({ image: videoRef.current }); } catch {}
          }
          if (runningRef.current) requestAnimationFrame(loop);
        }
        loop();
      } catch {
        setStage("error");
      }
    }

    init();
    return () => {
      runningRef.current = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      handsRef.current?.close();
      // Make sure relay is off on unmount
      setRelay(moduleId, { pump: false, uv_light: false }).catch(() => {});
    };
  }, [handleResults, moduleId, transitionStage]);

  // Pump countdown timer — starts when stage becomes pump_countdown
  useEffect(() => {
    if (stage !== "pump_countdown") return;
    setPumpCountdown(3);
    let count = 3;
    const interval = setInterval(() => {
      count--;
      setPumpCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        setRelay(moduleId, { pump: false, uv_light: false }).catch(() => {});
        transitionStage("lather");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, moduleId, transitionStage]);

  useEffect(() => {
    if (newlyScored === null) return;
    const t = setTimeout(() => setNewlyScored(null), 1500);
    return () => clearTimeout(t);
  }, [newlyScored]);

  function finishLather() {
    if (finishing) return;
    setFinishing(true);
    transitionStage("detect_rinse");
  }

  const stepsCount = scored.filter(Boolean).length;
  const latherSec = Math.floor(latheringMs / 1000);
  const latherOk = latheringMs >= 20_000;

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      <video ref={videoRef} playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

      {/* ── Loading ── */}
      {stage === "loading" && (
        <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-4 z-10">
          <Loader2 size={48} className="text-sky-400 animate-spin" />
          <p className="text-white/70 text-sm font-medium">{loadingMsg}</p>
        </div>
      )}

      {/* ── Error ── */}
      {stage === "error" && (
        <div className="absolute inset-0 bg-slate-900/92 flex flex-col items-center justify-center gap-5 px-8 z-10">
          <p className="text-white font-black text-xl">Camera unavailable</p>
          <button onClick={onExit} className="bg-white/10 text-white font-bold px-8 py-3 rounded-2xl">Go Back</button>
        </div>
      )}

      {/* Top-right corner target overlay — detect_hand stage */}
      {stage === "detect_hand" && (
        <>
          {/* Corner target box */}
          <div className="absolute top-16 right-4 z-20">
            <div className={`w-24 h-24 rounded-2xl border-4 flex flex-col items-center justify-center gap-1 transition-colors duration-200 ${detectProgress > 0.1 ? "border-emerald-400 bg-emerald-400/10" : "border-white/40 bg-white/5"}`}>
              <span className="text-3xl">✋</span>
              {/* Hold progress arc */}
              <svg width="32" height="32" className="-rotate-90">
                <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                <circle
                  cx="16" cy="16" r="12" fill="none"
                  stroke={detectProgress > 0.1 ? "#4ade80" : "#fff"}
                  strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 12}`}
                  strokeDashoffset={`${2 * Math.PI * 12 * (1 - detectProgress)}`}
                  className="transition-all duration-100"
                />
              </svg>
            </div>
          </div>

          {/* Instruction */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/85 to-transparent px-5 pt-12" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
            <p className="text-white font-black text-xl mb-1">Place your hand</p>
            <p className="text-white/60 text-sm leading-relaxed">Hold your right hand in the top-right corner to activate the water pump</p>
          </div>

          <button onClick={onExit} className="absolute top-4 right-4 z-30 w-10 h-10 bg-black/40 rounded-full flex items-center justify-center" style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}>
            <X size={18} className="text-white" />
          </button>
        </>
      )}

      {/* ── Pump countdown ── */}
      <AnimatePresence>
        {stage === "pump_countdown" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6"
          >
            <div className="bg-sky-600/30 backdrop-blur-sm border border-sky-400/40 rounded-[32px] p-8 flex flex-col items-center gap-4 mx-6">
              <div className="w-16 h-16 rounded-full bg-sky-400/20 flex items-center justify-center">
                <span className="text-4xl">💧</span>
              </div>
              <p className="text-white font-black text-xl">Pump activating…</p>
              <motion.p
                key={pumpCountdown}
                initial={{ scale: 1.4, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-amber-300 font-black text-7xl tabular-nums"
              >
                {pumpCountdown}
              </motion.p>
              <p className="text-white/60 text-sm text-center">Water will flow for 3 seconds.<br />Get ready to wash your hands!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Lather HUD ── */}
      {stage === "lather" && (
        <>
          <div className="absolute left-0 right-0 flex items-center px-4 gap-3 z-20" style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}>
            <div className={`flex-1 flex items-center gap-2 ${latherOk ? "text-emerald-400" : "text-white/80"}`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${handsVisible ? (latherOk ? "bg-emerald-400" : "bg-amber-400") : "bg-red-400"}`} />
              <span className="font-black text-base tabular-nums">
                {String(Math.floor(latherSec / 60)).padStart(2, "0")}:{String(latherSec % 60).padStart(2, "0")}
              </span>
              {latherOk && <span className="text-[10px] font-bold text-emerald-400">✓ 20s</span>}
            </div>
            <button onClick={onExit} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40">
              <X size={18} className="text-white" />
            </button>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 z-20" style={{ top: "calc(env(safe-area-inset-top) + 60px)" }}>
            <div className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm ${handsVisible ? "bg-emerald-500/30 text-emerald-300" : "bg-red-500/30 text-red-300"}`}>
              {handsVisible ? "Hands detected ✓" : "Show both hands"}
            </div>
          </div>

          {/* WHO steps panel */}
          <div className="absolute right-3 z-20 flex flex-col gap-1.5" style={{ top: "calc(env(safe-area-inset-top) + 100px)" }}>
            {WHO_STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-1.5 justify-end">
                <AnimatePresence>
                  {newlyScored === i && (
                    <motion.span initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-emerald-400 text-[9px] font-black">
                      +14 pts
                    </motion.span>
                  )}
                </AnimatePresence>
                <div className="flex flex-col items-end gap-0.5">
                  <span className={`text-[9px] font-bold leading-none ${scored[i] ? "text-emerald-300" : "text-white/50"}`}>{label}</span>
                  <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-150 ${scored[i] ? "bg-emerald-400" : "bg-amber-400"}`} style={{ width: `${Math.min(stepProgress[i] * 100, 100)}%` }} />
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-none ${scored[i] ? "bg-emerald-500" : "bg-white/10"}`}>
                  {scored[i] ? <CheckCircle2 size={12} className="text-white" /> : <span className="text-white/40 text-[9px] font-black">{i + 1}</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
            <div className="px-5 pt-10 flex flex-col gap-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
              <div className="flex items-center justify-between">
                <div><p className="text-white/50 text-xs font-semibold">Steps</p><p className="text-white font-black text-2xl leading-none">{stepsCount}<span className="text-white/40 text-sm font-bold">/7</span></p></div>
                <div className="text-center"><p className="text-white/50 text-xs font-semibold">Lathering</p><p className={`font-black text-2xl leading-none ${latherOk ? "text-emerald-400" : "text-white"}`}>{latherSec}s<span className="text-white/40 text-sm font-bold">/20s</span></p></div>
                <div className="text-right"><p className="text-white/50 text-xs font-semibold">Score</p><p className="text-amber-400 font-black text-2xl leading-none">{scorerRef.current.getScore()}</p></div>
              </div>
              <motion.button whileTap={{ scale: 0.96 }} transition={spring} onClick={finishLather} disabled={finishing} className="w-full h-[54px] rounded-[20px] bg-emerald-500 text-white font-black text-lg shadow-[0px_4px_0px_rgba(0,0,0,0.20)]">
                {latherOk ? "Done Lathering ✓" : `Done (${latherSec}s)`}
              </motion.button>
            </div>
          </div>
        </>
      )}

      {/* ── Detect rinse ── */}
      {stage === "detect_rinse" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 px-6">
          <div className="bg-sky-600/30 backdrop-blur-sm border border-sky-400/30 rounded-[32px] p-8 w-full text-center flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-sky-400/20 border-2 border-sky-400/40 flex items-center justify-center">
              <span className="text-5xl">🙌</span>
            </div>
            <p className="text-white font-black text-xl">Now rinse your hands</p>
            <p className="text-white/60 text-sm leading-relaxed">Place hands under the tap, then move them away from the camera when done rinsing</p>
            <div className={`px-4 py-2 rounded-full text-sm font-bold ${handsVisible ? "bg-amber-400/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"}`}>
              {handsVisible ? "Move hands away when done rinsing" : "Waiting for hands to clear…"}
            </div>
          </div>
          <button onClick={onExit} className="text-white/40 text-sm underline">Exit session</button>
        </div>
      )}

      {/* ── UV scoring ── */}
      {stage === "uv_score" && (
        <>
          {/* UV label */}
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4" style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-purple-300 font-black text-sm">UV Light Active</span>
            </div>
            <div className="text-purple-300 text-sm font-bold tabular-nums">
              {Math.ceil((1 - uvProgress) * UV_DURATION_MS / 1000)}s
            </div>
          </div>

          {/* UV progress bar */}
          <div className="absolute left-0 right-0 h-1 bg-purple-900/60 z-20" style={{ top: "calc(env(safe-area-inset-top) + 44px)" }}>
            <motion.div className="h-full bg-purple-400" style={{ width: `${uvProgress * 100}%` }} />
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-5 pt-12" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
            <p className="text-purple-300 font-black text-lg mb-1">UV Cleanliness Scan</p>
            <p className="text-white/50 text-sm">Hold still — analysing your hand hygiene coverage</p>
          </div>
        </>
      )}
    </div>
  );
}
