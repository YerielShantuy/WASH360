"use client";
import { useState } from "react";
import { ChevronLeft, Star, ShoppingBag, Coffee, Droplets, Car } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useEffect } from "react";
import { DEMO_VOUCHERS } from "@/lib/mobileMockData";

const CATS = ["All", "food", "shopping", "health", "transport"] as const;
const CAT_COLORS: Record<string, string> = {
  food: "bg-amber-100 text-amber-700",
  shopping: "bg-violet-100 text-violet-700",
  health: "bg-emerald-100 text-emerald-700",
  transport: "bg-blue-100 text-blue-700",
};
const CAT_ICONS: Record<string, React.ReactNode> = {
  food: <Coffee size={18} className="text-amber-600" />,
  shopping: <ShoppingBag size={18} className="text-violet-600" />,
  health: <Droplets size={18} className="text-emerald-600" />,
  transport: <Car size={18} className="text-blue-600" />,
};
const CAT_BG: Record<string, string> = {
  food: "bg-amber-50", shopping: "bg-violet-50", health: "bg-emerald-50", transport: "bg-blue-50",
};

export default function VouchersPage() {
  const [cat, setCat] = useState<string>("All");
  const [redeemed, setRedeemed] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      (supabase as any).from("profiles").select("total_points").eq("id", session.user.id).single()
        .then(({ data }: { data: { total_points: number } | null }) => { if (data) setUserPoints(data.total_points); });
    });
  }, []);

  const filtered = cat === "All" ? DEMO_VOUCHERS : DEMO_VOUCHERS.filter((v) => v.category === cat);

  function redeem(id: string) {
    setRedeemed((prev) => new Set([...prev, id]));
    setShown(id);
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white border-b border-slate-100 px-4 pb-4 pt-10 flex items-center gap-3">
        <Link href="/mobile" className="p-1 -ml-1"><ChevronLeft size={24} className="text-slate-700" /></Link>
        <div className="flex-1">
          <h1 className="text-slate-900 font-black text-xl">Rewards</h1>
          <p className="text-slate-400 text-xs">Balance: {userPoints.toLocaleString()} pts</p>
        </div>
      </div>

      <div className="bg-white border-b border-slate-100 px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none">
        {CATS.map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={`flex-none px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${cat === c ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-500"}`}>
            {c === "All" ? "All" : c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {shown && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-slate-900 font-black text-xl mb-1">Redeemed!</h2>
            <p className="text-slate-500 text-sm mb-4">Show this code at the partner outlet</p>
            <div className="bg-slate-100 rounded-xl px-4 py-3 mb-5">
              <p className="text-slate-800 font-mono font-bold text-lg tracking-widest">WASH-{shown.toUpperCase().slice(0,6)}</p>
            </div>
            <button onClick={() => setShown(null)} className="w-full bg-sky-600 text-white font-bold py-3 rounded-xl text-sm">Done</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 p-4">
        {filtered.map((v) => {
          const canAfford = userPoints >= v.points_cost;
          const done = redeemed.has(v.id);
          return (
            <div key={v.id} className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex gap-4 ${(!canAfford || done) ? "opacity-60" : ""}`}>
              <div className={`w-12 h-12 rounded-xl ${CAT_BG[v.category] ?? "bg-slate-50"} flex items-center justify-center flex-none`}>
                {CAT_ICONS[v.category]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 font-bold text-sm truncate">{v.title}</p>
                <p className="text-slate-400 text-xs">{v.partner}</p>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed line-clamp-2">{v.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${CAT_COLORS[v.category] ?? "bg-slate-100 text-slate-600"}`}>
                    <Star size={10} fill="currentColor" />
                    <span className="text-xs font-bold">{v.points_cost}</span>
                  </div>
                  {v.stock <= 10 && !done && <span className="text-red-500 text-xs font-semibold">{v.stock} left</span>}
                  {done && <span className="text-emerald-600 text-xs font-semibold">Redeemed</span>}
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <button disabled={!canAfford || done} onClick={() => redeem(v.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${done ? "bg-emerald-100 text-emerald-600 cursor-default" : canAfford ? "bg-sky-600 text-white active:bg-sky-700" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>
                  {done ? "Done" : "Redeem"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
