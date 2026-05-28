"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";

const SESSION_KEY = "w360_sessions";
const DISMISSED_KEY = "w360_pwa_dismissed";
const SESSIONS_BEFORE_PROMPT = 3;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      // Increment session counter
      const sessions = parseInt(localStorage.getItem(SESSION_KEY) ?? "0", 10) + 1;
      localStorage.setItem(SESSION_KEY, String(sessions));

      const dismissed = localStorage.getItem(DISMISSED_KEY);
      if (dismissed) return;

      const handler = (e: Event) => {
        e.preventDefault();
        const evt = e as BeforeInstallPromptEvent;
        setPromptEvent(evt);
        if (sessions >= SESSIONS_BEFORE_PROMPT) setVisible(true);
      };

      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    } catch {
      // localStorage unavailable
    }
  }, []);

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") {
      try { localStorage.setItem(DISMISSED_KEY, "1"); } catch {}
    }
    setVisible(false);
  }

  function dismiss() {
    try { localStorage.setItem(DISMISSED_KEY, "1"); } catch {}
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="fixed bottom-24 inset-x-3 z-[150] bg-white rounded-2xl shadow-xl border border-slate-100 p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
            <Download size={20} className="text-sky-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-900 font-bold text-sm">Install WASH360</p>
            <p className="text-slate-400 text-xs">Works offline, faster load times</p>
          </div>
          <button
            onClick={install}
            className="bg-sky-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
          >
            Install
          </button>
          <button onClick={dismiss} className="p-1 text-slate-300">
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
