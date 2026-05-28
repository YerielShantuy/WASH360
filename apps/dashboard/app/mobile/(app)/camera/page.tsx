"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Droplets, FileWarning } from "lucide-react";

const spring = { type: "spring" as const, stiffness: 200, damping: 15 };

export default function CameraPage() {
  return (
    <div className="flex flex-col min-h-dvh bg-[#F0F9FF] px-6 pt-safe items-center justify-center gap-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="text-center"
      >
        <h1 className="font-black text-3xl text-slate-900 leading-tight">What are you<br />doing today?</h1>
        <p className="text-slate-400 text-sm mt-2">Choose an activity to get started</p>
      </motion.div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        {/* Daily Streak Handwash — primary card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.06 }}
        >
          <Link href="/mobile/handwashing/demo-module">
            <motion.div
              whileTap={{ scale: 0.96 }}
              transition={spring}
              className="bg-sky-50 border border-sky-100 rounded-[32px] p-6 flex items-center gap-5 shadow-[0px_4px_0px_rgba(0,0,0,0.06),0px_8px_20px_rgba(2,132,199,0.10)] cursor-pointer"
            >
              <div className="w-16 h-16 rounded-[20px] bg-white flex items-center justify-center shadow-sm flex-none">
                <Droplets size={32} className="text-sky-600" />
              </div>
              <div className="flex-1">
                <p className="font-black text-lg text-slate-900 leading-tight">Daily Streak Handwash</p>
                <p className="text-xs text-slate-400 mt-1 leading-snug">AI-guided WHO 7-step technique · earn up to 150 pts</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs text-emerald-600 font-semibold">Camera active</span>
                </div>
              </div>
            </motion.div>
          </Link>
        </motion.div>

        {/* Report a WASH Issue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.12 }}
        >
          <Link href="/mobile/report">
            <motion.div
              whileTap={{ scale: 0.96 }}
              transition={spring}
              className="bg-white border border-slate-100 rounded-[32px] p-6 flex items-center gap-5 shadow-[0px_4px_0px_rgba(0,0,0,0.04),0px_8px_20px_rgba(0,0,0,0.06)] cursor-pointer"
            >
              <div className="w-16 h-16 rounded-[20px] bg-slate-50 flex items-center justify-center flex-none">
                <FileWarning size={32} className="text-slate-500" />
              </div>
              <div className="flex-1">
                <p className="font-black text-lg text-slate-800 leading-tight">Report Wash Issue</p>
                <p className="text-xs text-slate-400 mt-1 leading-snug">Report drains, taps, or WASH hazards near you · +50 pts</p>
              </div>
            </motion.div>
          </Link>
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...spring, delay: 0.22 }}
        className="text-slate-300 text-xs text-center"
      >
        NFC tap on any module auto-starts a session
      </motion.p>
    </div>
  );
}
