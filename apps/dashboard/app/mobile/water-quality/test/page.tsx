"use client";
import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, CheckCircle, Loader2, Timer, Camera, FlaskConical } from "lucide-react";
import { createClient } from "@/lib/supabase";
import dynamic from "next/dynamic";

const spring = { type: "spring" as const, stiffness: 200, damping: 15 };

const CameraCapture = dynamic(() => import("@/components/mobile/CameraCapture"), { ssr: false });

type Step = "instructions" | "timer" | "camera" | "analyzing" | "result";

interface WaterResult {
  ph: number;
  turbidity: "clear" | "slightly_turbid" | "turbid";
  chlorine: "safe" | "low" | "high";
  overall: "safe" | "caution" | "unsafe";
}

function analyzeStrip(_dataUrl: string): WaterResult {
  // Mock analysis — replace with real Edge Function call
  const ph = parseFloat((6.5 + Math.random() * 1.5).toFixed(1));
  const turbidityOpts = ["clear", "slightly_turbid", "turbid"] as const;
  const chlorineOpts = ["safe", "low", "high"] as const;
  const turbidity = turbidityOpts[Math.floor(Math.random() * 2)]; // mostly clear
  const chlorine = chlorineOpts[Math.floor(Math.random() * 2)];
  const overall = turbidity === "turbid" || chlorine === "high" ? "unsafe" : turbidity === "slightly_turbid" || chlorine === "low" ? "caution" : "safe";
  return { ph, turbidity, chlorine, overall };
}

export default function WaterQualityTestPage() {
  const [step, setStep] = useState<Step>("instructions");
  const [timeLeft, setTimeLeft] = useState(30);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [result, setResult] = useState<WaterResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    setStep("timer");
    setTimeLeft(30);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setStep("camera");
          setTimeout(() => setCameraOpen(true), 300);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  async function handleCapture(dataUrl: string) {
    setCapturedUrl(dataUrl);
    setCameraOpen(false);
    setStep("analyzing");

    // Try Edge Function, fall back to mock
    let analysis: WaterResult;
    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any).functions.invoke("analyze-water-strip", {
        body: { image: dataUrl },
      });
      if (error || !data) throw new Error("no data");
      analysis = data as WaterResult;
    } catch {
      await new Promise((r) => setTimeout(r, 1500)); // simulate processing
      analysis = analyzeStrip(dataUrl);
    }

    setResult(analysis);

    // Insert into DB
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await (supabase as any).from("water_quality_checks").insert({
          user_id: session.user.id,
          ph: analysis.ph,
          turbidity: analysis.turbidity,
          chlorine_level: analysis.chlorine,
          overall_status: analysis.overall,
          photo_path: "web-demo/strip.jpg",
          source: "test_strip",
        });
      }
    } catch {}

    setStep("result");
  }

  const overallConfig = {
    safe: { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", label: "Safe to Drink", emoji: "✅" },
    caution: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "Use with Caution", emoji: "⚠️" },
    unsafe: { color: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "Unsafe — Do Not Drink", emoji: "🚫" },
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3 pt-10">
        <Link href="/mobile" className="p-1 -ml-1">
          <ChevronLeft size={24} className="text-slate-700" />
        </Link>
        <div>
          <h1 className="text-slate-900 font-black text-base">Water Quality Test</h1>
          <p className="text-slate-400 text-xs">Test strip analysis</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center px-4 py-3 bg-white border-b border-slate-50 gap-2">
        {(["instructions", "timer", "camera", "analyzing", "result"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${s === step || (step === "analyzing" && s === "camera") ? "bg-sky-600 text-white" : ["instructions", "timer", "camera", "result"].indexOf(s) < ["instructions", "timer", "camera", "analyzing", "result"].indexOf(step) ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>
              {i + 1}
            </div>
            {i < 4 && <div className="flex-1 h-0.5 bg-slate-100 w-4" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Instructions */}
        {step === "instructions" && (
          <motion.div key="instructions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={spring} className="flex flex-col gap-5 p-4">
            <div className="bg-sky-50 rounded-[24px] border border-sky-100 p-6 flex flex-col items-center gap-4 text-center">
              <FlaskConical size={44} className="text-sky-500" />
              <h2 className="font-black text-xl text-slate-900">Test Strip Method</h2>
              <p className="text-slate-600 text-sm leading-relaxed">Use a WHO-approved water quality test strip to measure pH, turbidity, and chlorine levels in your water source.</p>
            </div>

            <div className="flex flex-col gap-3">
              {[
                { step: "1", text: "Dip the test strip in water for 2 seconds" },
                { step: "2", text: "Remove and hold flat for 30 seconds — don't shake" },
                { step: "3", text: "Photograph the strip immediately when the timer ends" },
                { step: "4", text: "We'll analyze the colors and give you results" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3 bg-white rounded-2xl border border-slate-100 p-3 shadow-sm">
                  <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-black text-sm flex-shrink-0">{item.step}</div>
                  <p className="text-slate-700 text-sm leading-snug pt-0.5">{item.text}</p>
                </div>
              ))}
            </div>

            <motion.button whileTap={{ scale: 0.96 }} transition={spring} onClick={startTimer} className="w-full py-4 rounded-2xl bg-sky-600 text-white font-black text-base shadow-lg shadow-sky-200">
              Start Test →
            </motion.button>
          </motion.div>
        )}

        {/* Timer */}
        {step === "timer" && (
          <motion.div key="timer" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={spring} className="flex flex-col items-center justify-center flex-1 gap-6 p-8">
            <Timer size={48} className="text-sky-500" />
            <div className="text-center">
              <p className="text-slate-500 text-sm font-medium mb-2">Hold strip flat and wait…</p>
              <motion.p
                key={timeLeft}
                initial={{ scale: 1.3, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-8xl font-black text-sky-600 tabular-nums"
              >
                {timeLeft}
              </motion.p>
              <p className="text-slate-400 text-sm mt-2">seconds remaining</p>
            </div>
            {/* Progress ring */}
            <svg width="120" height="120" className="-mt-4">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="52" fill="none" stroke="#0ea5e9" strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${2 * Math.PI * 52 * (timeLeft / 30)}`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
          </motion.div>
        )}

        {/* Camera step (show placeholder while camera opens) */}
        {step === "camera" && (
          <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center flex-1 gap-4 p-8 text-center">
            <Camera size={48} className="text-slate-400" />
            <p className="text-slate-600 font-bold">Opening camera…</p>
            <p className="text-slate-400 text-sm">Photograph the test strip clearly under good lighting</p>
          </motion.div>
        )}

        {/* Analyzing */}
        {step === "analyzing" && (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center flex-1 gap-4 p-8 text-center">
            {capturedUrl && <img src={capturedUrl} alt="Test strip" className="w-40 h-28 object-cover rounded-xl shadow-md" />}
            <Loader2 size={36} className="text-sky-500 animate-spin mt-2" />
            <p className="text-slate-700 font-bold">Analyzing strip…</p>
            <p className="text-slate-400 text-sm">Reading color indicators</p>
          </motion.div>
        )}

        {/* Result */}
        {step === "result" && result && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="flex flex-col gap-4 p-4">
            {/* Overall */}
            <div className={`rounded-[24px] border p-6 flex flex-col items-center gap-3 text-center ${overallConfig[result.overall].bg} ${overallConfig[result.overall].border}`}>
              <CheckCircle size={40} className={overallConfig[result.overall].color} />
              <p className="text-3xl">{overallConfig[result.overall].emoji}</p>
              <p className={`font-black text-xl ${overallConfig[result.overall].color}`}>{overallConfig[result.overall].label}</p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "pH Level", value: result.ph.toString(), note: result.ph >= 6.5 && result.ph <= 8.5 ? "Normal" : "Abnormal", ok: result.ph >= 6.5 && result.ph <= 8.5 },
                { label: "Turbidity", value: result.turbidity === "clear" ? "Clear" : result.turbidity === "slightly_turbid" ? "Slight" : "Turbid", note: result.turbidity === "clear" ? "Good" : "Check filter", ok: result.turbidity === "clear" },
                { label: "Chlorine", value: result.chlorine === "safe" ? "Safe" : result.chlorine === "low" ? "Low" : "High", note: result.chlorine === "safe" ? "Optimal" : "Adjust", ok: result.chlorine === "safe" },
              ].map((m) => (
                <div key={m.label} className={`rounded-2xl border p-3 text-center ${m.ok ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}>
                  <p className={`font-black text-lg ${m.ok ? "text-emerald-700" : "text-amber-700"}`}>{m.value}</p>
                  <p className="text-slate-500 text-[10px] font-semibold mt-0.5">{m.label}</p>
                  <p className={`text-[9px] font-bold mt-0.5 ${m.ok ? "text-emerald-600" : "text-amber-600"}`}>{m.note}</p>
                </div>
              ))}
            </div>

            {result.overall !== "safe" && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-amber-800 font-bold text-sm mb-1">Recommendations</p>
                <ul className="text-amber-700 text-xs leading-relaxed space-y-1">
                  {result.turbidity !== "clear" && <li>• Filter or boil water before use</li>}
                  {result.chlorine === "low" && <li>• Water may lack disinfection — boil before drinking</li>}
                  {result.chlorine === "high" && <li>• Let water stand 30 min before drinking</li>}
                  {(result.ph < 6.5 || result.ph > 8.5) && <li>• pH out of safe range — seek alternative source</li>}
                </ul>
              </div>
            )}

            <Link href="/mobile">
              <motion.button whileTap={{ scale: 0.96 }} transition={spring} className="w-full py-3.5 rounded-2xl bg-sky-600 text-white font-black text-base">
                Done
              </motion.button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera modal */}
      <CameraCapture
        open={cameraOpen}
        onCapture={(dataUrl) => handleCapture(dataUrl)}
        onClose={() => { setCameraOpen(false); setStep("camera"); }}
        instruction="Photograph the test strip clearly"
        facingMode="environment"
      />
    </div>
  );
}
