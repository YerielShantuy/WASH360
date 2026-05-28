"use client";

/**
 * Module session flow:
 *  loading → detect_hand → pump_countdown → lather
 *  lather: both hands absent 3 s → uv_light ON → uv_wait
 *  uv_wait: both hands detected 1 s → uv_score (5 s glow scan)
 *  uv_score done → uv_light OFF → onComplete(steps, score, latherMs)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2 } from "lucide-react";
import { createHandwashScorer, HAND_CONNECTIONS, type Landmark } from "@/lib/handwash-scorer";
import { setRelay } from "@/lib/relay";

const spring = { type: "spring" as const, stiffness: 200, damping: 15 };
const MEDIAPIPE_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915";

const WHO_STEPS = [
  "Palm to Palm", "Fingers Interlaced", "Palm over Back",
  "Backs of Fingers", "Rotational Thumbs", "Fingertips on Palm", "Wrists",
];

// Landmark indices for each WHO step zone (used for UV glow drawing)
const WHO_ZONES: number[][] = [
  [0, 5, 9, 13, 17],   // 0: palm centres
  [8, 12, 16, 20],     // 1: fingertips
  [1, 5, 9, 13, 17],   // 2: palm over back — dorsal side
  [5, 9, 13, 17],      // 3: knuckles / MCPs
  [1, 2, 3, 4],        // 4: thumb chain
  [8, 12, 16, 20, 9],  // 5: fingertips on palm
  [0],                 // 6: wrist
];

const UV_DURATION_MS   = 10_000;
const DETECT_HOLD_MS   = 1500;    // hold in corner to activate pump
const ABSENT_HOLD_MS   = 3_000;   // both hands absent before UV kicks in
const UV_WAIT_HOLD_MS  = 3_000;   // both hands back before scan starts
const PUMP_DURATION_S  = 5;       // pump on duration (seconds)

declare global {
  interface Window {
    Hands: new (config: { locateFile: (f: string) => string }) => MP;
  }
}
interface MP {
  setOptions(o: { maxNumHands?: number; modelComplexity?: 0|1; minDetectionConfidence?: number; minTrackingConfidence?: number }): void;
  onResults(cb: (r: MPResult) => void): void;
  send(i: { image: HTMLVideoElement }): Promise<void>;
  close(): void;
}
interface MPResult { multiHandLandmarks?: Landmark[][]; image: CanvasImageSource }

export type SessionStage = "loading"|"detect_hand"|"pump_countdown"|"lather"|"uv_wait"|"uv_score"|"error";

interface Props {
  moduleId: string;
  onComplete: (completedSteps: boolean[], score: number, latheringMs: number) => void;
  onExit: () => void;
}

function loadScript(src: string): Promise<void> {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const el = document.createElement("script");
    el.src = src; el.crossOrigin = "anonymous";
    el.onload = () => res();
    el.onerror = () => rej(new Error("Script load failed"));
    document.head.appendChild(el);
  });
}

function handInTopRight(hands: Landmark[][]): boolean {
  for (const hand of hands) {
    const w = hand[0];
    if (w.x > 0.65 && w.y < 0.35) return true;
  }
  return false;
}

function centroid(lm: Landmark[], indices: number[]) {
  const pts = indices.map(i => lm[i]);
  return {
    x: pts.reduce((s,p) => s+p.x,0)/pts.length,
    y: pts.reduce((s,p) => s+p.y,0)/pts.length,
  };
}

function toHSV(r: number, g: number, b: number): [number, number, number] {
  const rn = r/255, gn = g/255, bn = b/255;
  const max = Math.max(rn,gn,bn), min = Math.min(rn,gn,bn), d = max-min;
  let h = 0;
  if (d > 0) {
    if (max === rn)      h = ((gn-bn)/d + 6) % 6;
    else if (max === gn) h = (bn-rn)/d + 2;
    else                 h = (rn-gn)/d + 4;
    h *= 60;
  }
  return [h, max > 0 ? d/max : 0, max];
}

/** Sample a square region and return fraction of neon-yellow pixels. */
function sampleNeonYellow(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): number {
  const x0 = Math.max(0, Math.floor(cx - r));
  const y0 = Math.max(0, Math.floor(cy - r));
  let data: ImageData;
  try { data = ctx.getImageData(x0, y0, r*2, r*2); } catch { return 0; }
  let yellow = 0;
  for (let i = 0; i < data.data.length; i += 4) {
    const [h, s, v] = toHSV(data.data[i], data.data[i+1], data.data[i+2]);
    // Neon/fluorescent yellow: yellow-green hue, vivid, bright
    if (h >= 40 && h <= 95 && s > 0.40 && v > 0.35) yellow++;
  }
  return yellow / (data.data.length / 4);
}

/**
 * uvCoverage: 0–1 from actual fluorescent glow detection.
 * Pass 1 for optimistic live estimates during lathering.
 */
function calcFinalScore(scoredSteps: boolean[], latheringMs: number, uvCoverage = 1): number {
  const stepCount = scoredSteps.filter(Boolean).length;
  const stepPts   = stepCount * 12 + (stepCount === 7 ? 4 : 0); // max 88
  const latherPts = Math.min(6, Math.floor((latheringMs / 20_000) * 6));  // max 6
  const uvPts     = Math.round(uvCoverage * 6); // max 6 — real glow coverage
  return Math.min(100, stepPts + latherPts + uvPts);
}

export default function ModuleHandwashSession({ moduleId, onComplete, onExit }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef  = useRef<MP|null>(null);
  const streamRef = useRef<MediaStream|null>(null);
  const runningRef = useRef(true);
  const lastTimeRef = useRef(0);
  const scorerRef  = useRef(createHandwashScorer());

  // All tracking in refs so handleResults stays stable
  const stageRef       = useRef<SessionStage>("loading");
  const stepProgressRef = useRef<number[]>(Array(7).fill(0));
  const scoredRef      = useRef<boolean[]>(Array(7).fill(false));
  const latheringMsRef = useRef(0);
  const detectHoldRef  = useRef(0);   // corner hold
  const absentMsRef    = useRef(0);   // both hands absent ms (lather stage)
  const uvWaitMsRef    = useRef(0);   // both hands present ms (uv_wait stage)
  const uvScoreMsRef        = useRef(0);              // uv scan elapsed ms
  const uvHandsPresentMsRef = useRef(0);              // both hands in frame during uv_score
  const uvZoneHitsRef       = useRef<number[]>(Array(7).fill(0)); // frames each zone glowed
  const uvFrameCountRef     = useRef(0);              // total frames in UV scan
  const uvZoneGlowingRef    = useRef<boolean[]>(Array(7).fill(false)); // current-frame glow
  const uvOffscreenRef      = useRef<HTMLCanvasElement | null>(null);  // raw-pixel canvas
  const lastUiRef      = useRef(0);

  // UI state
  const [stage,         setStage]         = useState<SessionStage>("loading");
  const [loadingMsg,    setLoadingMsg]    = useState("Starting camera…");
  const [pumpCountdown, setPumpCountdown] = useState(3);
  const [stepProgress,  setStepProgress]  = useState<number[]>(Array(7).fill(0));
  const [scored,        setScored]        = useState<boolean[]>(Array(7).fill(false));
  const [latheringMs,   setLatheringMs]   = useState(0);
  const [handsVisible,  setHandsVisible]  = useState(false);
  const [newlyScored,   setNewlyScored]   = useState<number|null>(null);
  const [uvProgress,    setUvProgress]    = useState(0);
  const [detectProgress,setDetectProgress]= useState(0);
  const [absentProgress,  setAbsentProgress]  = useState(0);
  const [uvWaitProgress,  setUvWaitProgress]  = useState(0);
  const [isPortrait,      setIsPortrait]      = useState(false);

  const transitionStage = useCallback((next: SessionStage) => {
    stageRef.current = next;
    setStage(next);
  }, []);

  const handleResults = useCallback((results: MPResult) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const now = performance.now();
    const deltaMs = lastTimeRef.current ? Math.min(now - lastTimeRef.current, 100) : 16;
    lastTimeRef.current = now;

    const allHands: Landmark[][] = results.multiHandLandmarks ?? [];
    const cur = stageRef.current;

    // ── Draw base frame ──
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (cur === "uv_score" || cur === "uv_wait") {
      // UV mode: purple tint overlay
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(90, 0, 200, 0.28)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw UV skeleton with neon glow
      for (const hand of allHands) {
        ctx.strokeStyle = "#a855f7";
        ctx.lineWidth = 3;
        ctx.shadowColor = "#a855f7";
        ctx.shadowBlur = 14;
        for (const [a,b] of HAND_CONNECTIONS) {
          ctx.beginPath();
          ctx.moveTo(hand[a].x * canvas.width, hand[a].y * canvas.height);
          ctx.lineTo(hand[b].x * canvas.width, hand[b].y * canvas.height);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;

        // Draw WHO zone glow — yellow = fluorescent soap detected, dim purple = no glow
        if (cur === "uv_score") {
          for (let si = 0; si < 7; si++) {
            const c = centroid(hand, WHO_ZONES[si]);
            const cx2 = c.x * canvas.width;
            const cy2 = c.y * canvas.height;
            const glowing = uvZoneGlowingRef.current[si];

            if (glowing) {
              // Bright neon-yellow: fluorescent soap detected
              const grd = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, 26);
              grd.addColorStop(0, "rgba(255, 240, 0, 0.90)");
              grd.addColorStop(0.5, "rgba(200, 255, 0, 0.50)");
              grd.addColorStop(1, "rgba(180, 255, 0, 0)");
              ctx.fillStyle = grd;
              ctx.shadowColor = "#ffe000";
              ctx.shadowBlur = 18;
              ctx.beginPath();
              ctx.arc(cx2, cy2, 26, 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0;
            } else {
              // Dim purple: no fluorescence in this zone
              const grd2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, 14);
              grd2.addColorStop(0, "rgba(168, 85, 247, 0.25)");
              grd2.addColorStop(1, "rgba(168, 85, 247, 0)");
              ctx.fillStyle = grd2;
              ctx.beginPath();
              ctx.arc(cx2, cy2, 14, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // Landmark dots
        for (const lm of hand) {
          ctx.beginPath();
          ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 4, 0, Math.PI * 2);
          ctx.fillStyle = "#e879f9";
          ctx.shadowColor = "#e879f9";
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    } else {
      // Normal mode
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      for (const hand of allHands) {
        ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 2.5;
        for (const [a,b] of HAND_CONNECTIONS) {
          ctx.beginPath();
          ctx.moveTo(hand[a].x*canvas.width, hand[a].y*canvas.height);
          ctx.lineTo(hand[b].x*canvas.width, hand[b].y*canvas.height);
          ctx.stroke();
        }
        for (const lm of hand) {
          ctx.beginPath();
          ctx.arc(lm.x*canvas.width, lm.y*canvas.height, 5, 0, Math.PI*2);
          ctx.fillStyle = "#fbbf24"; ctx.fill();
          ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
        }
      }
    }

    // ── Stage logic ──
    if (cur === "detect_hand") {
      const inCorner = handInTopRight(allHands);
      if (inCorner) {
        detectHoldRef.current += deltaMs;
        if (detectHoldRef.current >= DETECT_HOLD_MS) {
          detectHoldRef.current = 0;
          transitionStage("pump_countdown");
          setRelay({ pump: true }).catch(() => {});
        }
      } else {
        detectHoldRef.current = Math.max(0, detectHoldRef.current - deltaMs * 0.5);
      }
      setDetectProgress(Math.min(detectHoldRef.current / DETECT_HOLD_MS, 1));
    }

    if (cur === "lather") {
      // Score WHO steps
      const state = scorerRef.current.processFrame(allHands, deltaMs);
      stepProgressRef.current = state.stepProgress;
      latheringMsRef.current  = state.latheringMs;
      state.scored.forEach((s, i) => { if (s && !scoredRef.current[i]) setNewlyScored(i); });
      scoredRef.current = state.scored;

      // Track both-hands-absent time
      const bothAbsent = allHands.length === 0;
      if (bothAbsent) {
        absentMsRef.current += deltaMs;
        if (absentMsRef.current >= ABSENT_HOLD_MS) {
          absentMsRef.current = 0;
          transitionStage("uv_wait");
          uvWaitMsRef.current = 0;
          setRelay({ pump: false, uv: true }).catch(() => {});
        }
      } else {
        absentMsRef.current = Math.max(0, absentMsRef.current - deltaMs * 0.3);
      }
      setAbsentProgress(Math.min(absentMsRef.current / ABSENT_HOLD_MS, 1));
    }

    if (cur === "uv_wait") {
      // Wait for BOTH hands to come back into frame
      const bothPresent = allHands.length >= 2;
      if (bothPresent) {
        uvWaitMsRef.current += deltaMs;
        if (uvWaitMsRef.current >= UV_WAIT_HOLD_MS) {
          uvWaitMsRef.current = 0;
          uvScoreMsRef.current = 0;
          uvHandsPresentMsRef.current = 0;
          uvZoneHitsRef.current = Array(7).fill(0);
          uvFrameCountRef.current = 0;
          uvZoneGlowingRef.current = Array(7).fill(false);
          setUvWaitProgress(0);
          setRelay({ pump: false, uv: true }).catch(() => {}); // ensure UV on for scan
          transitionStage("uv_score");
        }
      } else {
        uvWaitMsRef.current = 0;
      }
      setUvWaitProgress(Math.min(uvWaitMsRef.current / UV_WAIT_HOLD_MS, 1));
    }

    if (cur === "uv_score") {
      uvScoreMsRef.current += deltaMs;
      if (allHands.length >= 2) uvHandsPresentMsRef.current += deltaMs;
      const progress = Math.min(uvScoreMsRef.current / UV_DURATION_MS, 1);
      setUvProgress(progress);

      // Fluorescent yellow detection — sample raw video pixels per WHO zone
      if (allHands.length > 0) {
        let oc = uvOffscreenRef.current;
        if (!oc) { oc = document.createElement("canvas"); uvOffscreenRef.current = oc; }
        if (oc.width !== canvas.width || oc.height !== canvas.height) {
          oc.width = canvas.width; oc.height = canvas.height;
        }
        const octx = oc.getContext("2d", { willReadFrequently: true });
        if (octx) {
          octx.drawImage(results.image, 0, 0, oc.width, oc.height);
          uvFrameCountRef.current++;
          for (const hand of allHands) {
            for (let si = 0; si < 7; si++) {
              const c = centroid(hand, WHO_ZONES[si]);
              const ratio = sampleNeonYellow(octx, c.x * oc.width, c.y * oc.height, 22);
              if (ratio > 0.12) {
                uvZoneHitsRef.current[si]++;
                uvZoneGlowingRef.current[si] = true;
              } else {
                uvZoneGlowingRef.current[si] = false;
              }
            }
          }
        }
      }

      if (uvScoreMsRef.current >= UV_DURATION_MS) {
        transitionStage("loading"); // stop further updates
        setRelay({ pump: false, uv: false }).catch(() => {});
        const frames = uvFrameCountRef.current || 1;
        const uvCoverage = uvZoneHitsRef.current.reduce((s, h) => s + Math.min(h / frames, 1), 0) / 7;
        const finalScore = calcFinalScore(scoredRef.current, latheringMsRef.current, uvCoverage);
        onComplete(scoredRef.current, finalScore, latheringMsRef.current);
        return;
      }
    }

    // Batch UI at ~10fps
    if (now - lastUiRef.current > 100) {
      lastUiRef.current = now;
      setHandsVisible(allHands.length > 0);
      if (cur === "lather") {
        setStepProgress([...stepProgressRef.current]);
        setScored([...scoredRef.current]);
        setLatheringMs(latheringMsRef.current);
      }
    }
  }, [moduleId, onComplete, transitionStage]);

  // Camera + MediaPipe — init once
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
        while (!window.Hands && polls < 30) { await new Promise(r => setTimeout(r, 200)); polls++; }
        if (!window.Hands) throw new Error("MediaPipe not found");

        const hands = new window.Hands({ locateFile: f => `${MEDIAPIPE_CDN}/${f}` });
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
      } catch { setStage("error"); }
    }

    init();
    return () => {
      runningRef.current = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      handsRef.current?.close();
      setRelay({ pump: false, uv: false }).catch(() => {});
    };
  }, [handleResults, moduleId, transitionStage]);

  // Portrait detection — show rotate overlay instead of relying on JS lock API
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => setIsPortrait(e.matches);
    onChange(mq);
    mq.addEventListener("change", onChange);
    // Best-effort JS lock (works on Android standalone PWA; silently ignored elsewhere)
    try { (screen.orientation as any).lock("landscape").catch(() => {}); } catch {} // eslint-disable-line @typescript-eslint/no-explicit-any
    return () => {
      mq.removeEventListener("change", onChange);
      try { screen.orientation.unlock(); } catch {}
    };
  }, []);

  // Pump countdown — counts down PUMP_DURATION_S seconds then off
  useEffect(() => {
    if (stage !== "pump_countdown") return;
    setPumpCountdown(PUMP_DURATION_S);
    let count = PUMP_DURATION_S;
    const iv = setInterval(() => {
      count--;
      setPumpCountdown(count);
      if (count <= 0) {
        clearInterval(iv);
        setRelay({ pump: false }).catch(() => {});
        transitionStage("lather");
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [stage, moduleId, transitionStage]);

  useEffect(() => {
    if (newlyScored === null) return;
    const t = setTimeout(() => setNewlyScored(null), 1500);
    return () => clearTimeout(t);
  }, [newlyScored]);

  const stepsCount = scored.filter(Boolean).length;
  const latherSec  = Math.floor(latheringMs / 1000);
  const latherOk   = latheringMs >= 20_000;

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      {/* Portrait-mode gate — shown whenever device is held vertically */}
      {isPortrait && (
        <div className="absolute inset-0 bg-slate-900 z-[200] flex flex-col items-center justify-center gap-5 px-8">
          <span className="text-6xl" style={{ transform: "rotate(90deg)", display: "inline-block" }}>📱</span>
          <p className="text-white font-black text-2xl text-center">Rotate your device</p>
          <p className="text-white/60 text-sm text-center leading-relaxed">
            The handwashing session requires landscape orientation for the camera to track your hands properly.
          </p>
        </div>
      )}

      <video ref={videoRef} playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

      {/* Exit button — always visible except loading */}
      {stage !== "loading" && stage !== "pump_countdown" && (
        <button
          onClick={onExit}
          className="absolute z-30 w-10 h-10 flex items-center justify-center rounded-full bg-black/50"
          style={{ top: "calc(env(safe-area-inset-top) + 12px)", right: "16px" }}
        >
          <X size={18} className="text-white" />
        </button>
      )}

      {/* ── Loading ── */}
      {stage === "loading" && (
        <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-4 z-10">
          <div className="w-12 h-12 border-4 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
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

      {/* ── Detect hand (top-right corner) ── */}
      {stage === "detect_hand" && (
        <>
          {/* Corner target */}
          <div className="absolute top-16 right-4 z-20" style={{ top: "calc(env(safe-area-inset-top) + 56px)" }}>
            <div className={`w-24 h-24 rounded-2xl border-4 flex flex-col items-center justify-center gap-1 transition-colors duration-200 ${detectProgress > 0.1 ? "border-emerald-400 bg-emerald-400/10" : "border-white/40 bg-white/5"}`}>
              <span className="text-3xl">✋</span>
              <svg width="32" height="32" className="-rotate-90">
                <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                <circle cx="16" cy="16" r="12" fill="none" stroke={detectProgress > 0.1 ? "#4ade80" : "#fff"} strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${2*Math.PI*12}`} strokeDashoffset={`${2*Math.PI*12*(1-detectProgress)}`} className="transition-all duration-100" />
              </svg>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/85 to-transparent px-5 pt-12" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
            <p className="text-white font-black text-xl mb-1">Place your hand here</p>
            <p className="text-white/60 text-sm">Hold your right hand in the top-right corner to activate the water pump</p>
          </div>
        </>
      )}

      {/* ── Pump countdown ── */}
      <AnimatePresence>
        {stage === "pump_countdown" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 px-6">
            <div className="bg-sky-600/30 backdrop-blur-sm border border-sky-400/40 rounded-[32px] p-8 flex flex-col items-center gap-4 w-full max-w-xs">
              <span className="text-5xl">💧</span>
              <p className="text-white font-black text-xl">Water flowing…</p>
              <motion.p key={pumpCountdown} initial={{ scale: 1.4, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }}
                className="text-amber-300 font-black text-8xl tabular-nums">{pumpCountdown}</motion.p>
              <p className="text-white/60 text-sm text-center">Get ready to wash your hands!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Lather HUD (no Done button — auto-detects 3s hands-absent) ── */}
      {stage === "lather" && (
        <>
          <div className="absolute left-0 right-0 flex items-center px-4 gap-3 z-20" style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}>
            <div className={`flex-1 flex items-center gap-2 ${latherOk ? "text-emerald-400" : "text-white/80"}`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${handsVisible ? (latherOk ? "bg-emerald-400" : "bg-amber-400") : "bg-red-400"}`} />
              <span className="font-black text-base tabular-nums">
                {String(Math.floor(latherSec/60)).padStart(2,"0")}:{String(latherSec%60).padStart(2,"0")}
              </span>
              {latherOk && <span className="text-[10px] font-bold text-emerald-400">✓ 20s</span>}
            </div>
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
                      +{i === 6 ? "16" : "12"} pts
                    </motion.span>
                  )}
                </AnimatePresence>
                <div className="flex flex-col items-end gap-0.5">
                  <span className={`text-[9px] font-bold leading-none ${scored[i] ? "text-emerald-300" : "text-white/50"}`}>{label}</span>
                  <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-150 ${scored[i] ? "bg-emerald-400" : "bg-amber-400"}`} style={{ width: `${Math.min(stepProgress[i]*100,100)}%` }} />
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-none ${scored[i] ? "bg-emerald-500" : "bg-white/10"}`}>
                  {scored[i] ? <CheckCircle2 size={12} className="text-white" /> : <span className="text-white/40 text-[9px] font-black">{i+1}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom: score summary + absent countdown */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
            <div className="px-5 pt-10 flex flex-col gap-2" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
              <div className="flex items-center justify-between mb-1">
                <div><p className="text-white/50 text-xs font-semibold">Steps</p><p className="text-white font-black text-2xl leading-none">{stepsCount}<span className="text-white/40 text-sm font-bold">/7</span></p></div>
                <div className="text-center"><p className="text-white/50 text-xs font-semibold">Lathering</p><p className={`font-black text-2xl leading-none ${latherOk ? "text-emerald-400" : "text-white"}`}>{latherSec}s</p></div>
                <div className="text-right"><p className="text-white/50 text-xs font-semibold">Score est.</p><p className="text-amber-400 font-black text-2xl leading-none">{calcFinalScore(scored, latheringMs)}</p></div>
              </div>

              {/* Hands-absent auto-finish indicator */}
              <div className="bg-white/10 rounded-2xl px-4 py-2.5 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-white/70 text-xs font-semibold">Move hands away when done rinsing</p>
                  <p className="text-white/40 text-[10px]">UV scan starts automatically after {ABSENT_HOLD_MS/1000} seconds</p>
                </div>
                {absentProgress > 0 && (
                  <div className="w-10 h-10 flex-none relative">
                    <svg width="40" height="40" className="-rotate-90">
                      <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                      <circle cx="20" cy="20" r="16" fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round"
                        strokeDasharray={`${2*Math.PI*16}`} strokeDashoffset={`${2*Math.PI*16*(1-absentProgress)}`} className="transition-all duration-100" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-[9px] font-black">{Math.ceil((1-absentProgress)*(ABSENT_HOLD_MS/1000))}s</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── UV wait — both hands absent, UV on, waiting for hands to come back ── */}
      {stage === "uv_wait" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 px-6">
          <div className="bg-purple-900/50 backdrop-blur-sm border border-purple-500/40 rounded-[32px] p-8 w-full max-w-xs text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 border-2 border-purple-400/40 flex items-center justify-center">
              <span className="text-4xl">🫶</span>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-purple-300 font-black text-sm">UV Light Active</span>
              </div>
              <p className="text-white font-black text-xl">Hold hands up to camera</p>
              <p className="text-white/60 text-sm mt-1 leading-relaxed">We'll scan for soap residue under UV light</p>
            </div>
            {handsVisible ? (
              <div className="flex flex-col items-center gap-2 w-full">
                <p className="text-emerald-300 text-xs font-bold">Hands detected — hold still</p>
                <div className="relative w-14 h-14">
                  <svg width="56" height="56" className="-rotate-90">
                    <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(168,85,247,0.2)" strokeWidth="4" />
                    <circle cx="28" cy="28" r="22" fill="none" stroke="#a855f7" strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 22}`}
                      strokeDashoffset={`${2 * Math.PI * 22 * (1 - uvWaitProgress)}`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-black text-sm">
                      {Math.ceil((1 - uvWaitProgress) * (UV_WAIT_HOLD_MS / 1000))}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/10 text-white/50 px-4 py-2 rounded-full text-xs font-bold">
                Waiting for both hands…
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── UV score — 5-second glow analysis ── */}
      {stage === "uv_score" && (
        <>
          <div className="absolute left-0 right-0 flex items-center justify-between px-4 z-20" style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-purple-300 font-black text-sm">UV Scanning…</span>
            </div>
            <span className="text-purple-300 font-bold tabular-nums">
              {Math.ceil((1 - uvProgress) * UV_DURATION_MS / 1000)}s
            </span>
          </div>

          {/* UV progress bar */}
          <div className="absolute left-0 right-0 h-1.5 bg-purple-900/50 z-20" style={{ top: "calc(env(safe-area-inset-top) + 44px)" }}>
            <motion.div className="h-full bg-purple-400 rounded-r-full" style={{ width: `${uvProgress * 100}%` }} />
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/85 to-transparent px-5 pt-10" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-purple-300 font-black text-lg">UV Cleanliness Scan</p>
                <p className="text-white/50 text-sm">Hold still — analysing soap residue on your hands</p>
              </div>
              <div className="text-right">
                <p className="text-purple-300 font-black text-2xl">{stepsCount}/7</p>
                <p className="text-white/40 text-xs">zones clean</p>
              </div>
            </div>

            {/* UV legend */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-yellow-300" />
                <span className="text-white/50 text-[10px]">Soap glow detected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-white/50 text-[10px]">No glow</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
