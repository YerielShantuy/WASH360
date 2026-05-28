"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, CheckCircle, Plus, Trophy, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";

const spring = { type: "spring" as const, stiffness: 200, damping: 15 };

// 4×4 grid — 16 categories
const DEFAULT_CATEGORIES = [
  "Plastic Bottle", "Food Wrapper", "Cigarette Butt", "Glass Shard",
  "Styrofoam", "Cardboard", "Metal Can", "Plastic Bag",
  "Paper Cup", "Rubber", "Nappy/Diaper", "Straw",
  "Bottle Cap", "Tin Foil", "Foam Container", "Fishing Line",
];

// All lines for 4×4 bingo (rows, cols, diagonals)
const BINGO_LINES = [
  // Rows
  [0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15],
  // Columns
  [0,4,8,12],[1,5,9,13],[2,6,10,14],[3,7,11,15],
  // Diagonals
  [0,5,10,15],[3,6,9,12],
];

type CellStatus = "unclaimed" | "submitted" | "verified" | "rejected";
type Cell = { category: string; status: CellStatus };

function BingoContent() {
  const params = useSearchParams();
  const zoneId = params.get("zone");

  const [cells, setCells] = useState<Cell[]>([]);
  const [cardId, setCardId] = useState<string | null>(null);
  const [zoneName, setZoneName] = useState("Trash Bingo");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [showBingo, setShowBingo] = useState(false);

  const submitted = cells.filter((c) => c.status !== "unclaimed").length;
  const bingoLines = BINGO_LINES.filter((line) =>
    line.every((i) => cells[i]?.status === "submitted" || cells[i]?.status === "verified")
  );
  const hasBingo = bingoLines.length > 0;

  const loadCard = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const userId = session.user.id;
    const db = supabase as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (zoneId && !zoneId.startsWith("demo")) {
      const { data: zone } = await db.from("bingo_zones").select("name").eq("id", zoneId).single() as { data: { name: string } | null };
      if (zone) setZoneName(zone.name);

      const { data: existing } = await db
        .from("bingo_cards")
        .select("id, cells")
        .eq("user_id", userId)
        .eq("zone_id", zoneId)
        .is("completed_at", null)
        .maybeSingle() as { data: { id: string; cells: Cell[] } | null };

      if (existing) {
        setCardId(existing.id);
        const savedCells = existing.cells ?? [];
        // Pad/extend to 16 cells if it was saved as 3×3
        const normalized: Cell[] = DEFAULT_CATEGORIES.map((cat, i) =>
          savedCells[i] ?? { category: cat, status: "unclaimed" }
        );
        setCells(normalized);
      } else {
        const newCells: Cell[] = DEFAULT_CATEGORIES.map((c) => ({ category: c, status: "unclaimed" }));
        const { data: created } = await db
          .from("bingo_cards")
          .insert({ user_id: userId, zone_id: zoneId, cells: newCells, extra_submissions_count: 0 })
          .select("id")
          .single() as { data: { id: string } | null };
        if (created) { setCardId(created.id); setCells(newCells); }
      }
    } else {
      // Demo / no zone — just show the grid
      if (zoneId?.startsWith("demo") || zoneId) setZoneName("Demo Zone");
      setCells(DEFAULT_CATEGORIES.map((c) => ({ category: c, status: "unclaimed" })));
    }
    setLoading(false);
  }, [zoneId]);

  useEffect(() => { loadCard(); }, [loadCard]);

  // Show BINGO celebration when first line is completed
  useEffect(() => {
    if (hasBingo && !showBingo) setShowBingo(true);
  }, [hasBingo, showBingo]);

  async function tapCell(idx: number) {
    if (cells[idx]?.status !== "unclaimed" || submitting !== null) return;
    setSubmitting(idx);

    const newCells = cells.map((c, i) =>
      i === idx ? { ...c, status: "submitted" as CellStatus } : c
    );

    if (cardId) {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const db = supabase as any; // eslint-disable-line @typescript-eslint/no-explicit-any

      if (session) {
        await db.from("bingo_cards").update({ cells: newCells }).eq("id", cardId);
        await db.from("bingo_submissions").insert({
          card_id: cardId,
          user_id: session.user.id,
          category: cells[idx].category,
          photo_path: "web-demo/placeholder.jpg",
          photo_hash: `demo-${Date.now()}-${idx}`,
          ml_confidence: 0.85,
          item_count: 1,
          is_extra: false,
          status: "pending",
          points_awarded: 25,
          location: null,
          synced_at: new Date().toISOString(),
        });
        await db.rpc("award_points", {
          p_user_id: session.user.id,
          p_amount: 25,
          p_source: "bingo",
          p_reference: cardId,
        });
      }
    }

    setCells(newCells);
    setSubmitting(null);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full pt-20 gap-3">
        <Loader2 size={36} className="text-sky-500 animate-spin" />
        <p className="text-slate-400 text-sm">Loading your bingo card...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* BINGO celebration overlay */}
      <AnimatePresence>
        {showBingo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6"
            onClick={() => setShowBingo(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={spring}
              className="bg-white rounded-[32px] shadow-2xl p-8 text-center"
            >
              <p className="font-black text-5xl text-amber-400 mb-2">BINGO!</p>
              <Trophy size={44} className="text-amber-500 mx-auto mb-3" />
              <p className="text-slate-600 font-semibold text-sm">You got a line! Keep going for more 🎯</p>
              <button onClick={() => setShowBingo(false)} className="mt-4 bg-sky-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm">
                Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3 pt-10">
        <Link href="/mobile/camera" className="p-1 -ml-1">
          <ChevronLeft size={24} className="text-slate-700" />
        </Link>
        <div className="flex-1">
          <h1 className="text-slate-900 font-black text-base">Trash Bingo</h1>
          <p className="text-slate-400 text-xs">{zoneName} · {submitted}/16 items</p>
        </div>
        {hasBingo && (
          <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">
            {bingoLines.length} BINGO{bingoLines.length > 1 ? "s" : ""}!
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-100">
        <div className="h-full bg-sky-500 transition-all duration-500" style={{ width: `${(submitted / 16) * 100}%` }} />
      </div>

      <div className="flex flex-col gap-4 p-3">
        {/* 4×4 Grid */}
        <div className="grid grid-cols-4 gap-2">
          {cells.map((cell, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.92 }}
              transition={spring}
              onClick={() => tapCell(i)}
              disabled={cell.status !== "unclaimed" || submitting !== null}
              className={`
                aspect-square rounded-[22px] flex flex-col items-center justify-center gap-1 p-1.5 shadow-sm
                transition-all duration-200 disabled:cursor-default
                ${cell.status !== "unclaimed"
                  ? "bg-emerald-500 shadow-emerald-200 border-2 border-emerald-400"
                  : submitting === i
                  ? "bg-sky-50"
                  : "bg-white border border-slate-100"}
              `}
            >
              {submitting === i ? (
                <Loader2 size={16} className="text-sky-500 animate-spin" />
              ) : cell.status !== "unclaimed" ? (
                <CheckCircle size={18} className="text-white" />
              ) : (
                <Plus size={14} className="text-slate-300" />
              )}
              <span className={`text-[9px] font-semibold text-center leading-tight px-0.5 ${cell.status !== "unclaimed" ? "text-white" : "text-slate-500"}`}>
                {cell.category}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Collected", value: submitted, color: "text-emerald-600" },
            { label: "Remaining", value: 16 - submitted, color: "text-slate-600" },
            { label: "Points", value: `+${submitted * 25}`, color: "text-sky-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-3 text-center shadow-sm">
              <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
              <p className="text-slate-400 text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100">
          <p className="text-sky-800 font-bold text-sm mb-1">How to Play</p>
          <p className="text-sky-700 text-xs leading-relaxed">
            Tap a cell when you find that type of trash. Get 4 in a row — across, down, or diagonal — to BINGO! Each item earns +25 pts.
          </p>
        </div>
      </div>

      {/* Extra Trash FAB */}
      <motion.button
        whileTap={{ scale: 0.90 }}
        transition={spring}
        className="fixed right-4 z-40 w-14 h-14 rounded-full bg-amber-400 shadow-[0px_4px_0px_rgba(0,0,0,0.12),0px_8px_20px_rgba(245,158,11,0.35)] flex items-center justify-center"
        style={{ bottom: "calc(80px + env(safe-area-inset-bottom) + 16px)" }}
        title="Add extra trash item"
      >
        <Plus size={26} className="text-white" strokeWidth={2.5} />
      </motion.button>
    </div>
  );
}

export default function BingoPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-full pt-20 gap-3">
        <Loader2 size={36} className="text-sky-500 animate-spin" />
        <p className="text-slate-400 text-sm">Loading bingo card...</p>
      </div>
    }>
      <BingoContent />
    </Suspense>
  );
}
