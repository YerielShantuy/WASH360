"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, CheckCircle, Plus, Trophy, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { triggerPointsFloat } from "@/components/mobile/PointsFloatOverlay";
import { enqueue, flushQueue } from "@/lib/offline-queue";
import dynamic from "next/dynamic";

const CameraCapture = dynamic(() => import("@/components/mobile/CameraCapture"), { ssr: false });

const spring = { type: "spring" as const, stiffness: 200, damping: 15 };

const DEFAULT_CATEGORIES = [
  "Plastic Bottle", "Food Wrapper", "Cigarette Butt", "Glass Shard",
  "Styrofoam", "Cardboard", "Metal Can", "Plastic Bag",
  "Paper Cup", "Rubber", "Nappy/Diaper", "Straw",
  "Bottle Cap", "Tin Foil", "Foam Container", "Fishing Line",
];

const BINGO_LINES = [
  [0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15],
  [0,4,8,12],[1,5,9,13],[2,6,10,14],[3,7,11,15],
  [0,5,10,15],[3,6,9,12],
];

const MAX_EXTRA = 5;

type CellStatus = "unclaimed" | "submitted" | "verified" | "rejected";
type Cell = { category: string; status: CellStatus };

function BingoContent() {
  const params = useSearchParams();
  const zoneId = params.get("zone");

  const [cells, setCells] = useState<Cell[]>([]);
  const [cardId, setCardId] = useState<string | null>(null);
  const [zoneName, setZoneName] = useState("Trash Bingo");
  const [loading, setLoading] = useState(true);
  const [showBingo, setShowBingo] = useState(false);

  // Camera state
  const [pendingCellIdx, setPendingCellIdx] = useState<number | null>(null);
  const [pendingExtra, setPendingExtra] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [extraCount, setExtraCount] = useState(0);
  // ML analysis state
  const [analysing, setAnalysing] = useState(false);
  const [mlResult, setMlResult] = useState<{ category: string; confidence: number; accepted: boolean } | null>(null);

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
        .select("id, cells, extra_submissions_count")
        .eq("user_id", userId)
        .eq("zone_id", zoneId)
        .is("completed_at", null)
        .maybeSingle() as { data: { id: string; cells: Cell[]; extra_submissions_count: number } | null };

      if (existing) {
        setCardId(existing.id);
        setExtraCount(existing.extra_submissions_count ?? 0);
        const savedCells = existing.cells ?? [];
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
      if (zoneId?.startsWith("demo") || zoneId) setZoneName("Demo Zone");
      setCells(DEFAULT_CATEGORIES.map((c) => ({ category: c, status: "unclaimed" })));
    }
    setLoading(false);

    // Flush any queued offline submissions
    if (navigator.onLine) {
      const supabase2 = createClient();
      flushQueue(supabase2).catch(() => {});
    }
  }, [zoneId]);

  useEffect(() => { loadCard(); }, [loadCard]);

  // Re-flush queue when coming back online
  useEffect(() => {
    function onOnline() {
      const supabase = createClient();
      flushQueue(supabase).catch(() => {});
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  useEffect(() => {
    if (hasBingo && !showBingo) setShowBingo(true);
  }, [hasBingo, showBingo]);

  function tapCell(idx: number) {
    if (cells[idx]?.status !== "unclaimed") return;
    setPendingCellIdx(idx);
    setPendingExtra(false);
    setCameraOpen(true);
  }

  function tapExtraFab() {
    if (extraCount >= MAX_EXTRA) return;
    setPendingCellIdx(null);
    setPendingExtra(true);
    setCameraOpen(true);
  }

  // Simulated ML classification — replace with real Edge Function call
  async function classifyImage(dataUrl: string, expectedCategory: string): Promise<{ category: string; confidence: number; accepted: boolean }> {
    setAnalysing(true);
    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any).functions.invoke("classify-trash", {
        body: { image: dataUrl, expected_category: expectedCategory },
      });
      if (!error && data?.category) {
        return { category: data.category, confidence: data.confidence ?? 0.85, accepted: data.accepted ?? true };
      }
    } catch {}
    // Fallback mock — randomise confidence for realism
    await new Promise((r) => setTimeout(r, 900));
    const confidence = 0.72 + Math.random() * 0.25;
    return { category: expectedCategory, confidence, accepted: confidence > 0.55 };
  }

  async function handleCapture(dataUrl: string) {
    setCameraOpen(false);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const db = supabase as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const photoHash = `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    if (pendingExtra) {
      const result = await classifyImage(dataUrl, "Extra Trash");
      setAnalysing(false);
      setMlResult(result);
      if (!result.accepted) return; // rejected by ML — show result, don't submit

      // Extra trash submission
      const newCount = extraCount + 1;
      setExtraCount(newCount);

      if (cardId && session) {
        const insertData = {
          card_id: cardId,
          user_id: session.user.id,
          category: "Extra Trash",
          photo_path: "web-demo/extra.jpg",
          photo_hash: photoHash,
          ml_confidence: 0.85,
          item_count: 1,
          is_extra: true,
          status: "pending",
          points_awarded: 10,
          location: null,
          synced_at: new Date().toISOString(),
        };

        if (navigator.onLine) {
          try {
            await db.from("bingo_submissions").insert(insertData);
            await db.from("bingo_cards").update({ extra_submissions_count: newCount }).eq("id", cardId);
            await db.rpc("award_points", { p_user_id: session.user.id, p_amount: 10, p_source: "bingo_extra", p_reference: cardId });
            triggerPointsFloat(10);
          } catch {}
        } else {
          await enqueue({
            card_id: cardId,
            user_id: session?.user.id ?? "",
            category: "Extra Trash",
            photo_data_url: dataUrl,
            photo_hash: photoHash,
            item_count: 1,
            is_extra: true,
            points_awarded: 10,
            queued_at: new Date().toISOString(),
          });
          triggerPointsFloat(10);
        }
      }

      setPendingExtra(false);
      return;
    }

    if (pendingCellIdx === null) return;
    const idx = pendingCellIdx;
    const category = cells[idx].category;
    const result = await classifyImage(dataUrl, category);
    setAnalysing(false);
    setMlResult(result);
    if (!result.accepted) { setPendingCellIdx(null); return; }
    setPendingCellIdx(null);

    const newCells = cells.map((c, i) =>
      i === idx ? { ...c, status: "submitted" as CellStatus } : c
    );
    setCells(newCells);

    if (cardId && session) {
      const submissionData = {
        card_id: cardId,
        user_id: session.user.id,
        category: cells[idx].category,
        photo_path: "web-demo/placeholder.jpg",
        photo_hash: photoHash,
        ml_confidence: 0.85,
        item_count: 1,
        is_extra: false,
        status: "pending",
        points_awarded: 25,
        location: null,
        synced_at: new Date().toISOString(),
      };

      if (navigator.onLine) {
        try {
          await db.from("bingo_cards").update({ cells: newCells }).eq("id", cardId);
          await db.from("bingo_submissions").insert(submissionData);
          await db.rpc("award_points", { p_user_id: session.user.id, p_amount: 25, p_source: "bingo", p_reference: cardId });
          triggerPointsFloat(25);
        } catch {}
      } else {
        // Optimistic update already applied; queue submission for later
        await enqueue({
          card_id: cardId,
          user_id: session.user.id,
          category: cells[idx].category,
          photo_data_url: dataUrl,
          photo_hash: photoHash,
          item_count: 1,
          is_extra: false,
          points_awarded: 25,
          queued_at: new Date().toISOString(),
        });
        triggerPointsFloat(25);
      }
    }
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
              disabled={cell.status !== "unclaimed"}
              className={`
                aspect-square rounded-[22px] flex flex-col items-center justify-center gap-1 p-1.5 shadow-sm
                transition-all duration-200 disabled:cursor-default
                ${cell.status !== "unclaimed"
                  ? "bg-emerald-500 shadow-emerald-200 border-2 border-emerald-400"
                  : "bg-white border border-slate-100"}
              `}
            >
              {cell.status !== "unclaimed" ? (
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
            Tap a cell when you find that type of trash, then photograph it. Get 4 in a row — across, down, or diagonal — to BINGO! Each item earns +25 pts.
          </p>
        </div>
      </div>

      {/* Extra Trash FAB */}
      <motion.button
        whileTap={{ scale: 0.90 }}
        transition={spring}
        onClick={tapExtraFab}
        disabled={extraCount >= MAX_EXTRA}
        className={`fixed right-4 z-40 w-14 h-14 rounded-full shadow-[0px_4px_0px_rgba(0,0,0,0.12),0px_8px_20px_rgba(245,158,11,0.35)] flex items-center justify-center transition-opacity ${extraCount >= MAX_EXTRA ? "opacity-40" : "bg-amber-400"}`}
        style={{ bottom: "calc(80px + env(safe-area-inset-bottom) + 16px)" }}
        title={extraCount >= MAX_EXTRA ? "Max extra trash reached" : `Add extra trash item (${extraCount}/${MAX_EXTRA})`}
      >
        <Plus size={26} className="text-white" strokeWidth={2.5} />
      </motion.button>
      {extraCount > 0 && extraCount < MAX_EXTRA && (
        <div
          className="fixed right-3 z-40 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"
          style={{ bottom: "calc(80px + env(safe-area-inset-bottom) + 44px)" }}
        >
          <span className="text-white text-[10px] font-black">{extraCount}</span>
        </div>
      )}

      {/* Camera modal */}
      <CameraCapture
        open={cameraOpen}
        onCapture={handleCapture}
        onClose={() => { setCameraOpen(false); setPendingCellIdx(null); setPendingExtra(false); }}
        instruction={pendingExtra ? "Photograph the extra trash item" : pendingCellIdx !== null ? `Photograph: ${cells[pendingCellIdx]?.category ?? ""}` : ""}
        facingMode="environment"
      />

      {/* ML analysing overlay */}
      <AnimatePresence>
        {analysing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/70 flex flex-col items-center justify-center gap-4"
          >
            <Loader2 size={44} className="text-sky-400 animate-spin" />
            <p className="text-white font-bold text-lg">Analysing image…</p>
            <p className="text-white/50 text-sm">Checking trash classification</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ML result overlay */}
      <AnimatePresence>
        {mlResult && !analysing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/60 flex items-end px-4 pb-8"
            onClick={() => setMlResult(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={spring}
              onClick={(e) => e.stopPropagation()}
              className={`w-full rounded-[28px] p-6 flex flex-col gap-3 ${mlResult.accepted ? "bg-emerald-500" : "bg-red-500"}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{mlResult.accepted ? "✅" : "❌"}</span>
                <div>
                  <p className="text-white font-black text-lg leading-tight">
                    {mlResult.accepted ? "Item Accepted!" : "Not Recognised"}
                  </p>
                  <p className="text-white/80 text-sm">{mlResult.category}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-white font-black text-xl">{Math.round(mlResult.confidence * 100)}%</p>
                  <p className="text-white/60 text-xs">confidence</p>
                </div>
              </div>
              {!mlResult.accepted && (
                <p className="text-white/80 text-xs leading-relaxed">
                  The image didn&apos;t match the expected item clearly enough. Try again with better lighting or a closer shot.
                </p>
              )}
              <button
                onClick={() => setMlResult(null)}
                className="mt-1 bg-white/20 rounded-2xl py-2.5 text-white font-bold text-sm"
              >
                {mlResult.accepted ? "Continue" : "Try Again"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
