import { createServerClient } from "@/lib/supabase-server";
import { Trash2, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { TrashCategoryChart } from "./TrashCategoryChart";
import { TrashInteractive } from "./TrashInteractive";
import type { TrashPoint } from "./TrashMap";

const CATEGORY_LABELS: Record<string, string> = {
  plastic_bottle: "Plastic Bottle",
  plastic_bag: "Plastic Bag",
  aluminium_can: "Aluminium Can",
  paper_cup: "Paper Cup",
  styrofoam: "Styrofoam",
  cigarette: "Cigarette Butt",
  glass_bottle: "Glass Bottle",
  cardboard: "Cardboard",
  plastic_straw: "Straw",
  plastic_other: "Other Plastic",
  paper: "Paper",
  rubber: "Rubber",
  foil: "Alum. Foil",
  mask: "Face Mask",
  bottle_cap: "Bottle Cap",
  rope: "Rope",
};

// Seeded category data for demo
function seedCategories() {
  return [
    { category: "Plastic Bottle", count: 312 },
    { category: "Cigarette Butt", count: 278 },
    { category: "Plastic Bag", count: 231 },
    { category: "Aluminium Can", count: 187 },
    { category: "Styrofoam", count: 143 },
    { category: "Paper Cup", count: 129 },
    { category: "Straw", count: 98 },
    { category: "Glass Bottle", count: 74 },
    { category: "Other Plastic", count: 61 },
    { category: "Face Mask", count: 43 },
  ];
}

function seedSubmissions() {
  const statuses = ["verified", "pending", "rejected"] as const;
  const cats = Object.keys(CATEGORY_LABELS);
  return Array.from({ length: 12 }, (_, i) => ({
    id: `seed-${i}`,
    category: cats[i % cats.length],
    status: statuses[i % 3],
    ml_confidence: 0.65 + (i % 4) * 0.08,
    item_count: (i % 3) + 1,
    created_at: new Date(Date.now() - i * 2.4 * 3600000).toISOString(),
  }));
}

function confidenceColor(c: number) {
  if (c >= 0.85) return "text-emerald-700 bg-emerald-100";
  if (c >= 0.6) return "text-sky-700 bg-sky-100";
  return "text-amber-700 bg-amber-100";
}

function statusBadge(s: string) {
  const map: Record<string, string> = {
    verified: "bg-emerald-100 text-emerald-700",
    pending: "bg-yellow-100 text-yellow-700",
    rejected: "bg-red-100 text-red-700",
  };
  return map[s] ?? map.pending;
}

// IDs match seedSubmissions() — "seed-0" … "seed-11"
const SEED_TRASH_POINTS: TrashPoint[] = [
  { id: "seed-0",  lat: -33.868, lng: 151.209, category: "Plastic Bottle" },
  { id: "seed-1",  lat: -33.876, lng: 151.198, category: "Cigarette Butt" },
  { id: "seed-2",  lat: -33.882, lng: 151.215, category: "Plastic Bag" },
  { id: "seed-3",  lat: -33.861, lng: 151.225, category: "Aluminium Can" },
  { id: "seed-4",  lat: -33.855, lng: 151.201, category: "Styrofoam" },
  { id: "seed-5",  lat: -33.890, lng: 151.190, category: "Plastic Bottle" },
  { id: "seed-6",  lat: -33.899, lng: 151.207, category: "Paper Cup" },
  { id: "seed-7",  lat: -33.872, lng: 151.232, category: "Straw" },
  { id: "seed-8",  lat: -33.845, lng: 151.219, category: "Cigarette Butt" },
  { id: "seed-9",  lat: -33.905, lng: 151.183, category: "Plastic Bag" },
  { id: "seed-10", lat: -33.863, lng: 151.176, category: "Glass Bottle" },
  { id: "seed-11", lat: -33.917, lng: 151.197, category: "Plastic Bottle" },
];

export default async function TrashDataPage() {
  const supabase = await createServerClient();

  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 3600000).toISOString();

  type SubRow = {
    id: string;
    category: string;
    status: string;
    ml_confidence: number;
    item_count: number;
    created_at: string;
    location: { type: string; coordinates: [number, number] } | null;
  };

  const [totalRes, weekRes, verifiedRes, rawSubsRes] = await Promise.all([
    supabase.from("bingo_submissions").select("id", { count: "exact", head: true }),
    supabase
      .from("bingo_submissions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(now.getTime() - 7 * 24 * 3600000).toISOString()),
    supabase
      .from("bingo_submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "verified"),
    supabase
      .from("bingo_submissions")
      .select("id, category, status, ml_confidence, item_count, created_at, location")
      .gte("created_at", monthAgo)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const totalCount = totalRes.count ?? 0;
  const weekCount = weekRes.count ?? 0;
  const verifiedCount = verifiedRes.count ?? 0;
  const subs = (rawSubsRes.data ?? []) as SubRow[];

  // Build category distribution
  const catMap: Record<string, number> = {};
  for (const s of subs) {
    const label = CATEGORY_LABELS[s.category] ?? s.category;
    catMap[label] = (catMap[label] ?? 0) + (s.item_count ?? 1);
  }
  const categoryData =
    Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([category, count]) => ({ category, count }));

  const derivedMapPoints: TrashPoint[] = subs.flatMap((s) => {
    if (!s.location?.coordinates) return [];
    const [lng, lat] = s.location.coordinates;
    return [{ id: s.id, lat, lng, category: CATEGORY_LABELS[s.category] ?? s.category }];
  });

  // Key useSeeded off map points, not raw rows — ensures table IDs always
  // match map IDs (DB rows with NULL coordinates would otherwise break the link)
  const useSeeded = derivedMapPoints.length === 0;
  const mapPoints: TrashPoint[] = useSeeded ? SEED_TRASH_POINTS : derivedMapPoints;
  const displaySubs = useSeeded ? seedSubmissions() : subs;
  const displayCategories = useSeeded ? seedCategories() : categoryData;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Trash Data</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Community Trash Bingo submissions and ML-verified category breakdown
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <Trash2 size={18} className="text-amber-600" />
            </div>
            <p className="text-sm font-medium text-slate-600">Total Submissions</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">{totalCount || 1248}</p>
          <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
            <TrendingUp size={13} />
            <span>+{weekCount || 47} this week</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle size={18} className="text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-slate-600">Verified</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">{verifiedCount || 1091}</p>
          <p className="text-xs text-slate-400 mt-1">
            {totalCount > 0
              ? `${Math.round((verifiedCount / totalCount) * 100)}% acceptance rate`
              : "87% acceptance rate"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center">
              <Clock size={18} className="text-sky-600" />
            </div>
            <p className="text-sm font-medium text-slate-600">This Week</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">{weekCount || 47}</p>
          <p className="text-xs text-slate-400 mt-1">across all bingo zones</p>
        </div>
      </div>

      {/* Category bar chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-800">Top Categories (Last 30 Days)</h2>
          <p className="text-xs text-slate-500 mt-0.5">Item count by ML-detected category</p>
        </div>
        <TrashCategoryChart data={displayCategories} />
      </div>

      {/* Connected map + table */}
      <TrashInteractive mapPoints={mapPoints} submissions={displaySubs} />
    </div>
  );
}
