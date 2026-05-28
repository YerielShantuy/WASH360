"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FloatItem {
  id: string;
  amount: number;
  x: number; // percent from left
}

export function triggerPointsFloat(amount: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ amount: number }>("wash360:points", { detail: { amount } })
  );
}

export default function PointsFloatOverlay() {
  const [items, setItems] = useState<FloatItem[]>([]);

  useEffect(() => {
    function handle(e: Event) {
      const amount = (e as CustomEvent<{ amount: number }>).detail.amount;
      if (!amount) return;
      const id = Math.random().toString(36).slice(2);
      const x = 20 + Math.random() * 60;
      setItems((prev) => [...prev, { id, amount, x }]);
      setTimeout(
        () => setItems((prev) => prev.filter((i) => i.id !== id)),
        1800
      );
    }
    window.addEventListener("wash360:points", handle);
    return () => window.removeEventListener("wash360:points", handle);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[300]" aria-hidden>
      <AnimatePresence>
        {items.map((item) => (
          <motion.p
            key={item.id}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -90, scale: 1.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ position: "absolute", bottom: 110, left: `${item.x}%` }}
            className="font-black text-2xl text-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]"
          >
            +{item.amount} pts
          </motion.p>
        ))}
      </AnimatePresence>
    </div>
  );
}
