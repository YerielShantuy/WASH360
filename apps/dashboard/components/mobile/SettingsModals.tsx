"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Moon, Sun, MapPin, Info, ChevronRight, Monitor } from "lucide-react";

const spring = { type: "spring" as const, stiffness: 200, damping: 15 };

type ModalId = "notifications" | "appearance" | "location" | "about" | null;

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${on ? "bg-sky-500" : "bg-slate-200"}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${on ? "translate-x-6" : "translate-x-0.5"}`} />
    </button>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/50 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={spring}
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-white rounded-t-[32px] shadow-2xl pb-safe"
      >
        <div className="w-10 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1" />
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-50">
          <h2 className="font-black text-lg text-slate-900">{title}</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4 max-h-[65vh] overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

function NotificationsModal({ onClose }: { onClose: () => void }) {
  const [push, setPush] = useState(true);
  const [events, setEvents] = useState(true);
  const [streak, setStreak] = useState(true);
  const [points, setPoints] = useState(false);
  const [reports, setReports] = useState(true);

  const items = [
    { label: "Push Notifications", desc: "Allow WASH360 to send notifications", value: push, onChange: setPush },
    { label: "Event Reminders", desc: "Remind me 1 day before RSVPed events", value: events, onChange: setEvents },
    { label: "Streak Alerts", desc: "Notify me if my streak is about to break", value: streak, onChange: setStreak },
    { label: "Points Updates", desc: "Notify me when I earn points", value: points, onChange: setPoints },
    { label: "Report Updates", desc: "Notify me when my reports are reviewed", value: reports, onChange: setReports },
  ];

  return (
    <ModalShell title="Notifications" onClose={onClose}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-slate-800 font-semibold text-sm">{item.label}</p>
            <p className="text-slate-400 text-xs mt-0.5">{item.desc}</p>
          </div>
          <Toggle on={item.value} onChange={item.onChange} />
        </div>
      ))}
    </ModalShell>
  );
}

type Theme = "system" | "light" | "dark";

function AppearanceModal({ onClose }: { onClose: () => void }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [largeText, setLargeText] = useState(false);

  const themes: { id: Theme; label: string; Icon: React.ElementType }[] = [
    { id: "system", label: "System", Icon: Monitor },
    { id: "light", label: "Light", Icon: Sun },
    { id: "dark", label: "Dark", Icon: Moon },
  ];

  return (
    <ModalShell title="Appearance" onClose={onClose}>
      <div>
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">Theme</p>
        <div className="grid grid-cols-3 gap-2">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-colors ${theme === t.id ? "bg-sky-50 border-sky-400" : "bg-slate-50 border-slate-100"}`}
            >
              <t.Icon size={20} className={theme === t.id ? "text-sky-600" : "text-slate-400"} />
              <span className={`text-xs font-bold ${theme === t.id ? "text-sky-700" : "text-slate-500"}`}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-slate-800 font-semibold text-sm">Reduced Motion</p>
          <p className="text-slate-400 text-xs mt-0.5">Minimise animations throughout the app</p>
        </div>
        <Toggle on={reducedMotion} onChange={setReducedMotion} />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-slate-800 font-semibold text-sm">Large Text</p>
          <p className="text-slate-400 text-xs mt-0.5">Increase font size for better readability</p>
        </div>
        <Toggle on={largeText} onChange={setLargeText} />
      </div>
    </ModalShell>
  );
}

function LocationModal({ onClose }: { onClose: () => void }) {
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [shareWithCommunity, setShareWithCommunity] = useState(false);
  const [analyticsOpt, setAnalyticsOpt] = useState(true);

  return (
    <ModalShell title="Location & Privacy" onClose={onClose}>
      <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100">
        <p className="text-sky-800 font-bold text-sm mb-1">Your data stays local</p>
        <p className="text-sky-700 text-xs leading-relaxed">WASH360 only uses your location to show nearby modules and bingo zones. We never sell your data to third parties.</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-slate-800 font-semibold text-sm">Location Access</p>
          <p className="text-slate-400 text-xs mt-0.5">Used for nearby stations and bingo zones</p>
        </div>
        <Toggle on={locationEnabled} onChange={setLocationEnabled} />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-slate-800 font-semibold text-sm">Share with Community</p>
          <p className="text-slate-400 text-xs mt-0.5">Show your activity on the community map</p>
        </div>
        <Toggle on={shareWithCommunity} onChange={setShareWithCommunity} />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-slate-800 font-semibold text-sm">Anonymous Analytics</p>
          <p className="text-slate-400 text-xs mt-0.5">Help improve WASH360 with anonymous usage data</p>
        </div>
        <Toggle on={analyticsOpt} onChange={setAnalyticsOpt} />
      </div>
    </ModalShell>
  );
}

function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell title="About WASH360" onClose={onClose}>
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="w-16 h-16 rounded-[20px] bg-sky-600 flex items-center justify-center">
          <span className="text-white font-black text-2xl">W</span>
        </div>
        <div className="text-center">
          <p className="font-black text-xl text-slate-900">WASH360</p>
          <p className="text-slate-400 text-sm">Version 1.0.0</p>
        </div>
      </div>
      <div className="bg-slate-50 rounded-2xl p-4 flex flex-col gap-3">
        {[
          { label: "Mission", value: "Gamify water, sanitation & hygiene education across Sydney and beyond." },
          { label: "Partner", value: "City of Sydney Council — WASH360 Community Initiative." },
          { label: "Data", value: "All data is stored securely in Australia. We comply with the Privacy Act 1988." },
        ].map((item) => (
          <div key={item.label}>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">{item.label}</p>
            <p className="text-slate-700 text-sm leading-snug">{item.value}</p>
          </div>
        ))}
      </div>
      {[
        { label: "Privacy Policy", href: "#" },
        { label: "Terms of Service", href: "#" },
        { label: "Open Source Licences", href: "#" },
      ].map((link) => (
        <a key={link.label} href={link.href} className="flex items-center justify-between py-2 border-b border-slate-50">
          <span className="text-slate-700 text-sm font-semibold">{link.label}</span>
          <ChevronRight size={16} className="text-slate-300" />
        </a>
      ))}
    </ModalShell>
  );
}

// ── Exported client wrapper used inside the server account page ──
export default function SettingsMenuClient({
  menuItems,
}: {
  menuItems: { id: ModalId; icon: string; label: string; hint?: string | null; href?: string | null }[];
}) {
  const [open, setOpen] = useState<ModalId>(null);

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {menuItems.map((item, i) => (
          <div key={item.label}>
            {i > 0 && <div className="h-px bg-slate-50 ml-14" />}
            {item.href ? (
              <a
                href={item.href}
                className="flex items-center gap-4 px-4 py-4 active:bg-slate-50"
              >
                <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-lg">{item.icon}</div>
                <span className="flex-1 font-semibold text-sm text-slate-800">{item.label}</span>
                {item.hint && <span className="text-sky-600 text-xs font-bold bg-sky-50 px-2 py-0.5 rounded-full">{item.hint}</span>}
                <ChevronRight size={16} className="text-slate-300" />
              </a>
            ) : (
              <button
                onClick={() => setOpen(item.id)}
                className="w-full flex items-center gap-4 px-4 py-4 active:bg-slate-50 text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-lg">{item.icon}</div>
                <span className="flex-1 font-semibold text-sm text-slate-800">{item.label}</span>
                {item.hint && <span className="text-slate-400 text-xs">{item.hint}</span>}
                <ChevronRight size={16} className="text-slate-300" />
              </button>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {open === "notifications" && <NotificationsModal onClose={() => setOpen(null)} />}
        {open === "appearance" && <AppearanceModal onClose={() => setOpen(null)} />}
        {open === "location" && <LocationModal onClose={() => setOpen(null)} />}
        {open === "about" && <AboutModal onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </>
  );
}
