"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, AlertCircle, CheckCircle2, FlipHorizontal } from "lucide-react";
import { createHandwashScorer, HAND_CONNECTIONS, type Landmark } from "@/lib/handwash-scorer";

const spring = { type: "spring" as const, stiffness: 200, damping: 15 };

const WHO_STEPS = [
  "Palm to Palm",
  "Fingers Interlaced",
  "Palm over Back",
  "Backs of Fingers",
  "Rotational Thumbs",
  "Fingertips on Palm",
  "Wrists",
] as const;

const MEDIAPIPE_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915";

declare global {
  interface Window {
    Hands: new (config: { locateFile: (file: string) => string }) => MediaPipeHands;
  }
}

interface MediaPipeHands {
  setOptions(opts: {
    maxNumHands?: number;
    modelComplexity?: 0 | 1;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
  }): void;
  onResults(cb: (results: MediaPipeResults) => void): void;
  send(input: { image: HTMLVideoElement }): Promise<void>;
  close(): void;
}

interface MediaPipeResults {
  multiHandLandmarks?: Landmark[][];
  image: CanvasImageSource;
}

export interface Props {
  onComplete: (completedSteps: boolean[], score: number, latheringMs: number) => void;
  onExit: () => void;
  /** Allow front/back toggle — true for daily streak, false for module sessions */
  allowCameraFlip?: boolean;
  /** Fixed facing mode — used when allowCameraFlip is false */
  facingMode?: "user" | "environment";
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

function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function HandwashingCamera({
  onComplete,
  onExit,
  allowCameraFlip = false,
  facingMode: initialFacing = "environment",
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<MediaPipeHands | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runningRef = useRef(true);
  const lastTimeRef = useRef(0);

  // ── All scorer state kept in refs so handleResults stays stable ──
  const scorerRef = useRef(createHandwashScorer());
  const stepProgressRef = useRef<number[]>(Array(7).fill(0));
  const scoredRef = useRef<boolean[]>(Array(7).fill(false));
  const latheringMsRef = useRef(0);
  const handsVisibleRef = useRef(false);

  // UI state — updated via setState in handleResults, not causing effect re-runs
  const [status, setStatus] = useState<"loading" | "running" | "error">("loading");
  const [loadingMsg, setLoadingMsg] = useState("Starting camera…");
  const [stepProgress, setStepProgress] = useState<number[]>(Array(7).fill(0));
  const [scored, setScored] = useState<boolean[]>(Array(7).fill(false));
  const [latheringMs, setLatheringMs] = useState(0);
  const [handsVisible, setHandsVisible] = useState(false);
  const [newlyScored, setNewlyScored] = useState<number | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">(initialFacing);
  const lastUiUpdateRef = useRef(0);

  // Stable handleResults — reads from refs, not state
  const handleResults = useCallback((results: MediaPipeResults) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const now = performance.now();
    const deltaMs = lastTimeRef.current ? Math.min(now - lastTimeRef.current, 100) : 16;
    lastTimeRef.current = now;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    const allHands: Landmark[][] = results.multiHandLandmarks ?? [];

    // Draw skeleton overlay
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

    // Process all steps simultaneously — reads/writes refs only
    const state = scorerRef.current.processFrame(allHands, deltaMs);
    stepProgressRef.current = state.stepProgress;
    latheringMsRef.current = state.latheringMs;
    handsVisibleRef.current = state.handsVisible;

    // Detect newly completed steps (compare with ref, not state)
    state.scored.forEach((s, i) => {
      if (s && !scoredRef.current[i]) {
        setNewlyScored(i);
      }
    });
    scoredRef.current = state.scored;

    // Batch UI updates at ~10fps to avoid hammering React
    const now2 = performance.now();
    if (now2 - lastUiUpdateRef.current > 100) {
      lastUiUpdateRef.current = now2;
      setStepProgress([...state.stepProgress]);
      setScored([...state.scored]);
      setLatheringMs(state.latheringMs);
      setHandsVisible(state.handsVisible);
    }
  }, []); // ← stable: no state dependencies

  // Camera init — only re-runs when `facing` changes (flip button) or on mount
  useEffect(() => {
    let hands: MediaPipeHands | null = null;
    runningRef.current = true;
    scorerRef.current = createHandwashScorer(); // fresh scorer on flip
    stepProgressRef.current = Array(7).fill(0);
    scoredRef.current = Array(7).fill(false);
    latheringMsRef.current = 0;
    lastTimeRef.current = 0;

    setStatus("loading");
    setLoadingMsg("Starting camera…");
    setStepProgress(Array(7).fill(0));
    setScored(Array(7).fill(false));
    setLatheringMs(0);
    setHandsVisible(false);

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video || !runningRef.current) return;
        video.srcObject = stream;
        await video.play();

        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }

        setLoadingMsg("Loading hand tracking…");
        await loadScript(`${MEDIAPIPE_CDN}/hands.js`);

        let polls = 0;
        while (!window.Hands && polls < 30) {
          await new Promise((r) => setTimeout(r, 200));
          polls++;
        }
        if (!window.Hands) throw new Error("MediaPipe not found");

        hands = new window.Hands({ locateFile: (f) => `${MEDIAPIPE_CDN}/${f}` });
        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.5,
        });
        hands.onResults(handleResults);
        handsRef.current = hands;
        setStatus("running");

        async function loop() {
          if (!runningRef.current || !handsRef.current || !videoRef.current) return;
          if (videoRef.current.readyState >= 2) {
            try { await handsRef.current.send({ image: videoRef.current }); } catch {}
          }
          if (runningRef.current) requestAnimationFrame(loop);
        }
        loop();
      } catch {
        setStatus("error");
      }
    }

    init();

    return () => {
      runningRef.current = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      handsRef.current?.close();
      handsRef.current = null;
    };
  }, [facing, handleResults]);

  useEffect(() => {
    if (newlyScored === null) return;
    const t = setTimeout(() => setNewlyScored(null), 1500);
    return () => clearTimeout(t);
  }, [newlyScored]);

  function flipCamera() {
    setFacing((f) => (f === "user" ? "environment" : "user"));
  }

  function finish() {
    setFinishing(true);
    runningRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    const finalScore = scorerRef.current.getScore();
    const steps = scorerRef.current.getScoredSteps();
    const ms = scorerRef.current.getLatheringMs();
    onComplete(steps, finalScore, ms);
  }

  const stepsCount = scored.filter(Boolean).length;
  const latherSec = Math.floor(latheringMs / 1000);
  const latherOk = latheringMs >= 20_000;
  const isMirrored = facing === "user";

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      <video ref={videoRef} playsInline muted className="hidden" />

      {/* Canvas — mirrored for front camera, normal for back */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={isMirrored ? { transform: "scaleX(-1)" } : undefined}
      />

      {/* Loading */}
      {status === "loading" && (
        <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-4 z-10">
          <Loader2 size={48} className="text-sky-400 animate-spin" />
          <p className="text-white/70 text-sm font-medium">{loadingMsg}</p>
          <p className="text-white/30 text-xs">First load may take a few seconds</p>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="absolute inset-0 bg-slate-900/92 flex flex-col items-center justify-center gap-5 px-8 z-10">
          <div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center">
            <AlertCircle size={40} className="text-red-400" />
          </div>
          <div className="text-center">
            <p className="text-white font-black text-xl mb-2">Camera unavailable</p>
            <p className="text-white/50 text-sm leading-relaxed">
              Allow camera access and try again.
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }} transition={spring}
            onClick={onExit}
            className="w-full max-w-xs h-[52px] rounded-[20px] bg-white/10 text-white font-black"
          >
            Go Back
          </motion.button>
        </div>
      )}

      {/* HUD */}
      {status === "running" && (
        <>
          {/* Top bar */}
          <div
            className="absolute left-0 right-0 flex items-center px-4 gap-3 z-20"
            style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
          >
            <div className={`flex-1 flex items-center gap-2 ${latherOk ? "text-emerald-400" : "text-white/80"}`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${handsVisible ? (latherOk ? "bg-emerald-400" : "bg-amber-400") : "bg-red-400"}`} />
              <span className="font-black text-base tabular-nums">{fmtTime(latheringMs)}</span>
              {latherOk && <span className="text-[10px] font-bold text-emerald-400">✓ 20s</span>}
            </div>

            {/* Camera flip — only for streak mode */}
            {allowCameraFlip && (
              <button
                onClick={flipCamera}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40"
                aria-label="Flip camera"
              >
                <FlipHorizontal size={18} className="text-white" />
              </button>
            )}

            <button
              onClick={onExit}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40"
              aria-label="Exit"
            >
              <X size={18} className="text-white" />
            </button>
          </div>

          {/* Hands badge */}
          <div className="absolute left-1/2 -translate-x-1/2 z-20" style={{ top: "calc(env(safe-area-inset-top) + 60px)" }}>
            <div className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm ${
              handsVisible ? "bg-emerald-500/30 text-emerald-300" : "bg-red-500/30 text-red-300"
            }`}>
              {handsVisible ? "Hands detected ✓" : "Show both hands"}
            </div>
          </div>

          {/* WHO steps — right side panel */}
          <div
            className="absolute right-3 z-20 flex flex-col gap-1.5"
            style={{ top: "calc(env(safe-area-inset-top) + 100px)" }}
          >
            {WHO_STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-1.5 justify-end">
                <AnimatePresence>
                  {newlyScored === i && (
                    <motion.span
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-emerald-400 text-[9px] font-black"
                    >
                      +14 pts
                    </motion.span>
                  )}
                </AnimatePresence>
                <div className="flex flex-col items-end gap-0.5">
                  <span className={`text-[9px] font-bold leading-none ${scored[i] ? "text-emerald-300" : "text-white/50"}`}>
                    {label}
                  </span>
                  <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-150 ${scored[i] ? "bg-emerald-400" : "bg-amber-400"}`}
                      style={{ width: `${Math.min(stepProgress[i] * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-none ${scored[i] ? "bg-emerald-500" : "bg-white/10"}`}>
                  {scored[i]
                    ? <CheckCircle2 size={12} className="text-white" />
                    : <span className="text-white/40 text-[9px] font-black">{i + 1}</span>
                  }
                </div>
              </div>
            ))}
          </div>

          {/* Bottom HUD */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
            <div className="px-5 pt-10 flex flex-col gap-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/50 text-xs font-semibold">Steps</p>
                  <p className="text-white font-black text-2xl leading-none">
                    {stepsCount}<span className="text-white/40 text-sm font-bold">/7</span>
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-white/50 text-xs font-semibold">Lathering</p>
                  <p className={`font-black text-2xl leading-none ${latherOk ? "text-emerald-400" : "text-white"}`}>
                    {latherSec}s<span className="text-white/40 text-sm font-bold">/20s</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-xs font-semibold">Score</p>
                  <p className="text-amber-400 font-black text-2xl leading-none">
                    {scorerRef.current.getScore()}
                  </p>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.96 }} transition={spring}
                onClick={finish}
                disabled={finishing}
                className="w-full h-[54px] rounded-[20px] bg-emerald-500 text-white font-black text-lg shadow-[0px_4px_0px_rgba(0,0,0,0.20)] disabled:opacity-60"
              >
                {finishing ? "Saving…" : latherOk ? "Finish Session ✓" : `Finish (${latherSec}s)`}
              </motion.button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
