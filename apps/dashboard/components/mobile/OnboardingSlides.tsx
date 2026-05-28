"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";

const spring = { type: "spring" as const, stiffness: 200, damping: 15 };

const SLIDES = [
  {
    emoji: "🤲",
    title: "Score your handwash",
    body: "NFC-triggered modules guide you through the WHO 7-step technique. Get up to 100 points per session and build a daily streak.",
    accent: "bg-sky-500",
  },
  {
    emoji: "🎯",
    title: "Play Trash Bingo",
    body: "Find litter in your neighborhood and photograph it to claim bingo squares. Complete lines to score big — each item earns points.",
    accent: "bg-amber-400",
  },
  {
    emoji: "🗺️",
    title: "Map your community",
    body: "See nearby handwash modules, active bingo zones, and water quality readings. Report floods or WASH issues straight to local councils.",
    accent: "bg-emerald-500",
  },
] as const;

const STORAGE_KEY = "w360_onboarded";

export default function OnboardingSlides() {
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);
  const [dir, setDir] = useState(1); // 1 = forward, -1 = back

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // localStorage unavailable (private mode) — skip onboarding
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setVisible(false);
  }

  function next() {
    if (slide < SLIDES.length - 1) {
      setDir(1);
      setSlide((s) => s + 1);
    } else {
      dismiss();
    }
  }

  if (!visible) return null;

  const current = SLIDES[slide];

  return (
    <div className="fixed inset-0 z-[400] flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm px-6">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring}
        className="w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden"
      >
        {/* Accent band */}
        <div className={`${current.accent} h-1.5 w-full`} />

        <div className="p-8 flex flex-col items-center gap-5">
          {/* Progress dots */}
          <div className="flex gap-2 self-center">
            {SLIDES.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === slide ? "w-6 h-2 bg-sky-600" : "w-2 h-2 bg-slate-200"
                }`}
              />
            ))}
          </div>

          {/* Slide content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={slide}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={spring}
              className="flex flex-col items-center gap-4 text-center"
            >
              <div className="w-24 h-24 rounded-[28px] bg-slate-50 flex items-center justify-center">
                <span className="text-5xl">{current.emoji}</span>
              </div>
              <h2 className="font-black text-2xl text-slate-900 leading-tight">
                {current.title}
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed max-w-[260px]">
                {current.body}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Actions */}
          <div className="w-full flex flex-col gap-3 mt-2">
            <motion.button
              whileTap={{ scale: 0.96 }}
              transition={spring}
              onClick={next}
              className="w-full h-[52px] rounded-[20px] bg-sky-600 text-white font-black text-base flex items-center justify-center gap-2 shadow-[0px_4px_0px_rgba(2,132,199,0.3)]"
            >
              {slide < SLIDES.length - 1 ? (
                <>
                  Next <ChevronRight size={18} />
                </>
              ) : (
                "Get started →"
              )}
            </motion.button>
            {slide < SLIDES.length - 1 && (
              <button
                onClick={dismiss}
                className="text-slate-400 text-sm font-medium py-1"
              >
                Skip
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
