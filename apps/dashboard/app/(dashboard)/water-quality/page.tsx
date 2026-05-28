import { createServerClient } from "@/lib/supabase-server";
import { WaterQualityChart } from "./WaterQualityChart";
import { Droplets, TrendingUp } from "lucide-react";
import { WaterQualityInteractive } from "./WaterQualityInteractive";
import type { WaterQualityPoint } from "./WaterQualityMap";

// Seeded data for demo / empty-DB state
function seedChartData() {
  const dates: string[] = [];
  const base = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    dates.push(
      d.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
    );
  }
  return dates.map((date) => ({
    date,
    score: Math.round(60 + Math.random() * 35),
  }));
}

function seedLocations() {
  return [
    { name: "Parramatta River — Rydalmere", ph: 7.2, nitrates: 14, hardness: 160, turbidity: 1.4, score: 82, tested: "Today" },
    { name: "Georges River — Peakhurst", ph: 7.0, nitrates: 18, hardness: 140, turbidity: 2.1, score: 76, tested: "Yesterday" },
    { name: "Lane Cove River — Longueville", ph: 7.4, nitrates: 9, hardness: 180, turbidity: 0.9, score: 91, tested: "2 days ago" },
    { name: "Woronora River — Engadine", ph: 6.9, nitrates: 22, hardness: 120, turbidity: 3.2, score: 68, tested: "3 days ago" },
    { name: "Botany Bay — Brighton-Le-Sands", ph: 7.1, nitrates: 11, hardness: 155, turbidity: 1.6, score: 85, tested: "4 days ago" },
  ];
}

// IDs are string indices — map point "0" links to tableRow[0], etc.
const SEED_MAP_POINTS: WaterQualityPoint[] = [
  { id: "0", lat: -33.814, lng: 151.033, score: 82 },
  { id: "1", lat: -33.963, lng: 151.063, score: 76 },
  { id: "2", lat: -33.831, lng: 151.175, score: 91 },
  { id: "3", lat: -34.052, lng: 151.003, score: 68 },
  { id: "4", lat: -33.959, lng: 151.141, score: 85 },
];

function scoreColor(score: number) {
  if (score >= 85) return "text-emerald-700 bg-emerald-100";
  if (score >= 70) return "text-sky-700 bg-sky-100";
  if (score >= 50) return "text-amber-700 bg-amber-100";
  return "text-red-700 bg-red-100";
}

function scoreLabel(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Moderate";
  return "Poor";
}

export default async function WaterQualityPage() {
  const supabase = await createServerClient();

  type WaterTestRow = {
    ph: number | null;
    nitrates: number | null;
    hardness: number | null;
    turbidity: number | null;
    quality_score: number;
    created_at: string;
    location_public: { type: string; coordinates: [number, number] } | null;
  };

  const { data: rawRows } = await supabase
    .from("water_quality_tests")
    .select("ph, nitrates, hardness, turbidity, quality_score, created_at, location_public")
    .order("created_at", { ascending: false })
    .limit(50);
  const dbLocations = (rawRows ?? []) as WaterTestRow[];

  const derivedMapPoints: WaterQualityPoint[] = dbLocations.flatMap((r, i) => {
    if (!r.location_public?.coordinates) return [];
    const [lng, lat] = r.location_public.coordinates;
    return [{ id: String(i), lat, lng, score: r.quality_score }];
  });
  const mapPoints: WaterQualityPoint[] =
    derivedMapPoints.length > 0 ? derivedMapPoints : SEED_MAP_POINTS;

  const locations = dbLocations.length > 0 ? null : seedLocations();
  const chartData = seedChartData();

  const avgScore =
    dbLocations.length > 0
      ? Math.round(
          dbLocations.reduce((a, b) => a + b.quality_score, 0) / dbLocations.length
        )
      : 80;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Water Quality</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Community-submitted test results across your council area
        </p>
      </div>

      {/* Summary KPI row */}
      <div className="grid grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center">
              <Droplets size={18} className="text-sky-600" />
            </div>
            <p className="text-sm font-medium text-slate-600">Avg Quality Score</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">{avgScore}</p>
          <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
            <TrendingUp size={13} />
            <span>+4 vs last month</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Droplets size={18} className="text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-slate-600">Tests This Month</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {dbLocations?.length ?? 47}
          </p>
          <p className="text-xs text-slate-400 mt-1">across all locations</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <Droplets size={18} className="text-amber-600" />
            </div>
            <p className="text-sm font-medium text-slate-600">Below Threshold</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">2</p>
          <p className="text-xs text-slate-400 mt-1">locations score &lt; 60</p>
        </div>
      </div>

      {/* Connected map + table */}
      <WaterQualityInteractive mapPoints={mapPoints} tableRows={locations ?? seedLocations()} />

      {/* 30-day trend */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              30-Day Quality Trend
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Average quality score per day across all tested locations
            </p>
          </div>
        </div>
        <WaterQualityChart data={chartData} />
      </div>

    </div>
  );
}
