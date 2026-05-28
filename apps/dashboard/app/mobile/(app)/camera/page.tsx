"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Droplets, Target, FileWarning } from "lucide-react";

const spring = { type: "spring" as const, stiffness: 200, damping: 15 };

const cardEnter = (i: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { ...spring, delay: i * 0.06 },
});

const MODES = [
  {
    href: "/mobile/handwashing/demo-module",
    Icon: Droplets,
    label: "Handwash\nModule",
    desc: "NFC-triggered 7-step scoring",
    bg: "bg-sky-50",
    iconColor: "text-sky-600",
    border: "border-sky-100",
  },
  {
    href: "/mobile/bingo",
    Icon: Target,
    label: "Trash\nBingo",
    desc: "Collect & classify nearby litter",
    bg: "bg-amber-50",
    iconColor: "text-amber-500",
    border: "border-amber-100",
  },
];

export default function CameraPage() {
  return (
    <div className="flex flex-col min-h-dvh bg-[#F0F9FF] px-6 pt-safe items-center justify-center gap-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="text-center"
      >
        <h1 className="font-black text-3xl text-slate-900 leading-tight">What are you<br />doing today?</h1>
        <p className="text-slate-400 text-sm mt-2">Choose a mode to get started</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {MODES.map((mode, i) => (
          <motion.div key={mode.href} {...cardEnter(i)}>
            <Link href={mode.href}>
              <motion.div
                whileTap={{ scale: 0.93 }}
                transition={spring}
                className={`${mode.bg} border ${mode.border} rounded-[32px] p-6 flex flex-col items-center gap-3 shadow-[0px_4px_0px_rgba(0,0,0,0.06),0px_8px_20px_rgba(2,132,199,0.08)] cursor-pointer`}
              >
                <div className={`w-16 h-16 rounded-[20px] bg-white flex items-center justify-center shadow-sm`}>
                  <mode.Icon size={32} className={mode.iconColor} />
                </div>
                <p className="font-black text-base text-slate-900 text-center whitespace-pre-line leading-tight">{mode.label}</p>
                <p className="text-xs text-slate-400 text-center leading-snug">{mode.desc}</p>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Report Issue — secondary action */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...spring, delay: 0.18 }}
      >
        <Link href="/mobile/report">
          <motion.div
            whileTap={{ scale: 0.96 }}
            transition={spring}
            className="flex items-center gap-2 px-5 py-3 rounded-[20px] bg-white border border-slate-200 shadow-sm text-slate-600 font-semibold text-sm"
          >
            <FileWarning size={16} className="text-slate-400" />
            Report a WASH issue
          </motion.div>
        </Link>
      </motion.div>
    </div>
  );
}
