"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, AlertCircle, Timer } from "lucide-react";
import { createHandwashScorer, HAND_CONNECTIONS, type Landmark } from "@/lib/handwash-scorer";

const spring = { type: "spring" as const, stiffness: 200, damping: 15 };

const WHO_STEPS = [
  { title: "Palm to Palm", desc: "Rub your palms together in circular motions" },
  { title: "Fingers Interlaced", desc: "Interlock fingers and rub palms both ways" },
  { title: "Palm over Back", desc: "One palm over the back of the other — swap hands" },
  { title: "Backs of Fingers", desc: "Knuckles facing knuckles, rub together" },
  { title: "Rotational Thumbs", desc: "Clasp thumb and rotate it in circles — then swap" },
  { title: "Fingertips on Palm", desc: "Rub fingertips on opposite palm in circles" },
  { title: "Wrists", desc: "Clasp each wrist and rotate — then swap" },
] as const;

const MEDIAPIPE_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915";

// Types for MediaPipe Hands WASM — loaded at runtime via CDN script
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
  multiHandedness?: Array<{ label: string; score: number }>;
  image: CanvasImageSource;
}

interface Props {
  onComplete: (completedSteps: boolean[], score: number) => void;
  onExit: () => void;
  onFallbackToTimer: () => void;
}

// Progress ring geometry
const RING_RADIUS = 38;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.crossOrigin = "anonymous";
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(el);
  });
}

export default function HandwashingCamera({ onComplete, onExit, onFallbackToTimer }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<MediaPipeHands | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scorerRef = useRef(createHandwashScorer());
  const runningRef = useRef(true);
  const lastTimeRef = useRef(0);
  const currentStepRef = useRef(0); // kept in sync with state for use inside RAF

  const [status, setStatus] = useState<"loading" | "running" | "error">("loading");
  const [loadingMsg, setLoadingMsg] = useState("Starting camera…");
  const [currentStep, setCurrentStep] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [handsCount, setHandsCount] = useState(0);
  const [justScored, setJustScored] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(Array(7).fill(false));

  // Keep ref in sync so the onResults closure always sees the latest step
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  const handleResults = useCallback(
    (results: MediaPipeResults) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const now = performance.now();
      const deltaMs = lastTimeRef.current ? Math.min(now - lastTimeRef.current, 100) : 16;
      lastTimeRef.current = now;

      // Draw camera frame (mirrored in CSS, so draw normally here)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      const allHands: Landmark[][] = results.multiHandLandmarks ?? [];
      setHandsCount(allHands.length);

      // Draw skeleton overlay for each detected hand
      for (const hand of allHands) {
        // Connections
        ctx.strokeStyle = "#38bdf8"; // sky-400
        ctx.lineWidth = 2.5;
        for (const [a, b] of HAND_CONNECTIONS) {
          ctx.beginPath();
          ctx.moveTo(hand[a].x * canvas.width, hand[a].y * canvas.height);
          ctx.lineTo(hand[b].x * canvas.width, hand[b].y * canvas.height);
          ctx.stroke();
        }
        // Landmark dots
        for (const lm of hand) {
          ctx.beginPath();
          ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 5, 0, Math.PI * 2);
          ctx.fillStyle = "#fbbf24"; // amber-400
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // Run WHO gesture scorer for the active step
      const stepIdx = currentStepRef.current;
      const { progress, scored } = scorerRef.current.processStep(stepIdx, allHands, deltaMs);
      setStepProgress(progress);

      if (scored) {
        const newCompleted = scorerRef.current.getScoredSteps();
        setCompletedSteps([...newCompleted]);
        setJustScored(true);

        setTimeout(() => {
          setJustScored(false);
          if (stepIdx < 6) {
            const next = stepIdx + 1;
            currentStepRef.current = next;
            setCurrentStep(next);
            setStepProgress(0);
          } else {
            // All 7 steps complete
            runningRef.current = false;
            const finalScore = scorerRef.current.getScore();
            onComplete(newCompleted, finalScore);
          }
        }, 900);
      }
    },
    [onComplete]
  );

  useEffect(() => {
    let hands: MediaPipeHands | null = null;

    async function init() {
      try {
        // 1. Start camera (prefer front-facing for self-monitoring)
        setLoadingMsg("Starting camera…");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "user" },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video || !runningRef.current) return;
        video.srcObject = stream;
        await video.play();

        // Size canvas to match video dimensions
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }

        // 2. Load MediaPipe Hands WASM from CDN
        setLoadingMsg("Loading hand tracking…");
        await loadScript(`${MEDIAPIPE_CDN}/hands.js`);

        // Poll for global to appear (CDN UMD bundle sets window.Hands)
        let polls = 0;
        while (!window.Hands && polls < 30) {
          await new Promise((r) => setTimeout(r, 200));
          polls++;
        }
        if (!window.Hands) throw new Error("MediaPipe global not found after loading");

        // 3. Configure MediaPipe
        hands = new window.Hands({
          locateFile: (file) => `${MEDIAPIPE_CDN}/${file}`,
        });
        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 0, // fast on mobile
          minDetectionConfidence: 0.65,
          minTrackingConfidence: 0.5,
        });
        hands.onResults(handleResults);
        handsRef.current = hands;

        setStatus("running");

        // 4. Frame processing loop — await each frame before scheduling next
        async function loop() {
          if (!runningRef.current || !handsRef.current || !videoRef.current) return;
          if (videoRef.current.readyState >= 2) {
            try {
              await handsRef.current.send({ image: videoRef.current });
            } catch {
              // Ignore frame errors (e.g. video paused briefly)
            }
          }
          if (runningRef.current) {
            requestAnimationFrame(loop);
          }
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
      handsRef.current?.close();
    };
  }, [handleResults]);

  const ringOffset = RING_CIRCUMFERENCE * (1 - stepProgress);

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      {/* Hidden video element — MediaPipe reads from it */}
      <video ref={videoRef} playsInline muted className="hidden" />

      {/* Canvas: camera frame + landmark skeleton — CSS-mirrored for selfie feel */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: "scaleX(-1)" }}
      />

      {/* ── Loading overlay ── */}
      {status === "loading" && (
        <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-4 z-10">
          <Loader2 size={48} className="text-sky-400 animate-spin" />
          <p className="text-white/70 text-sm font-medium">{loadingMsg}</p>
          <p className="text-white/30 text-xs">This may take a few seconds on first load</p>
        </div>
      )}

      {/* ── Error overlay ── */}
      {status === "error" && (
        <div className="absolute inset-0 bg-slate-900/92 flex flex-col items-center justify-center gap-5 px-8 z-10">
          <div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center">
            <AlertCircle size={40} className="text-red-400" />
          </div>
          <div className="text-center">
            <p className="text-white font-black text-xl mb-2">Camera unavailable</p>
            <p className="text-white/50 text-sm leading-relaxed">
              Camera or hand-tracking failed to start.<br />
              Allow camera access and try again, or use the timer instead.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
            <motion.button
              whileTap={{ scale: 0.96 }}
              transition={spring}
              onClick={onFallbackToTimer}
              className="w-full h-[52px] rounded-[20px] bg-amber-400 text-white font-black flex items-center justify-center gap-2 shadow-[0px_4px_0px_rgba(0,0,0,0.15)]"
            >
              <Timer size={18} />
              Use Timer Mode
            </motion.button>
            <button onClick={onExit} className="text-white/40 text-sm underline py-2">
              Exit
            </button>
          </div>
        </div>
      )}

      {/* ── Running HUD ── */}
      {status === "running" && (
        <>
          {/* Step progress bars */}
          <div
            className="absolute left-4 right-14 flex gap-1.5 z-20"
            style={{ top: "calc(env(safe-area-inset-top) + 16px)" }}
          >
            {Array(7)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1 rounded-full transition-colors duration-300 ${
                    completedSteps[i]
                      ? "bg-amber-400"
                      : i === currentStep
                      ? "bg-white/70"
                      : "bg-white/25"
                  }`}
                />
              ))}
          </div>

          {/* Close button */}
          <button
            onClick={onExit}
            className="absolute right-4 w-11 h-11 flex items-center justify-center z-20"
            style={{ top: "calc(env(safe-area-inset-top) + 8px)" }}
            aria-label="Exit handwashing"
          >
            <X size={22} className="text-white/70" />
          </button>

          {/* Hands-detected badge */}
          <div
            className="absolute left-1/2 -translate-x-1/2 z-20"
            style={{ top: "calc(env(safe-area-inset-top) + 52px)" }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={handsCount}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  handsCount >= 2
                    ? "bg-emerald-500/30 text-emerald-300"
                    : handsCount === 1
                    ? "bg-amber-500/30 text-amber-300"
                    : "bg-red-500/30 text-red-300"
                }`}
              >
                {handsCount === 0
                  ? "Show both hands"
                  : handsCount === 1
                  ? "Show both hands"
                  : "Both hands detected ✓"}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom HUD */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/85 via-black/50 to-transparent">
            <div className="px-6 pt-12 pb-10 flex items-end gap-5">
              {/* Progress ring */}
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg width="96" height="96" className="-rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r={RING_RADIUS}
                    fill="none"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="5"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r={RING_RADIUS}
                    fill="none"
                    stroke={justScored ? "#10B981" : "#F59E0B"}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={ringOffset}
                    className="transition-all duration-100"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <AnimatePresence mode="wait">
                    {justScored ? (
                      <motion.span
                        key="check"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={spring}
                        className="text-2xl"
                      >
                        ✓
                      </motion.span>
                    ) : (
                      <motion.span
                        key={`step-${currentStep}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="font-black text-2xl text-white leading-none"
                      >
                        {currentStep + 1}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <span className="text-white/40 text-[9px] font-semibold mt-0.5">of 7</span>
                </div>
              </div>

              {/* Step label + description */}
              <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={spring}
                  >
                    <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-0.5">
                      Step {currentStep + 1} of 7
                    </p>
                    <p className="text-white font-black text-lg leading-tight">
                      {WHO_STEPS[currentStep].title}
                    </p>
                    <p className="text-white/60 text-xs mt-1 leading-relaxed">
                      {WHO_STEPS[currentStep].desc}
                    </p>
                    {justScored && (
                      <motion.p
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-emerald-400 font-bold text-sm mt-1.5"
                      >
                        +14 pts! Keep going →
                      </motion.p>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Hold progress bar */}
                <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-100 ${
                      justScored ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                    style={{ width: `${stepProgress * 100}%` }}
                  />
                </div>
                <p className="text-white/30 text-[10px] mt-1">
                  {handsCount < 2
                    ? "Show both hands to the camera"
                    : justScored
                    ? "Step complete!"
                    : "Hold the gesture for 2 seconds"}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
