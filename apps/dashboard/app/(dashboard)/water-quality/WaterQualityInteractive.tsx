"use client";
import { useState, useEffect, useRef } from "react";
import { WaterQualityMapLoader } from "./WaterQualityMapLoader";
import type { WaterQualityPoint } from "./WaterQualityMap";

type LocationRow = {
  name: string;
  ph: number;
  nitrates: number;
  hardness: number;
  turbidity: number;
  score: number;
  tested: string;
};

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

interface Props {
  mapPoints: WaterQualityPoint[];
  tableRows: LocationRow[];
}

export function WaterQualityInteractive({ mapPoints, tableRows }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  useEffect(() => {
    if (!selectedId) return;
    rowRefs.current[selectedId]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  function toggle(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  return (
    <>
      {/* Map */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Quality Heatmap</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click a pin <span className="text-slate-400">or</span> a row to highlight both
            </p>
          </div>
          <div className="flex items-center gap-5 text-xs text-slate-500">
            {[
              { label: "Excellent", color: "#10B981" },
              { label: "Good",      color: "#0284C7" },
              { label: "Moderate",  color: "#F59E0B" },
              { label: "Poor",      color: "#EF4444" },
            ].map(({ label, color }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="h-80">
          <WaterQualityMapLoader points={mapPoints} selectedId={selectedId} onSelect={toggle} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Location Breakdown</h2>
          <div className="flex items-center gap-3">
            {selectedId && (
              <button
                onClick={() => setSelectedId(null)}
                className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors"
              >
                Clear selection ✕
              </button>
            )}
            <button className="text-sm text-sky-600 hover:text-sky-700 font-medium px-3 py-1.5 rounded-lg border border-sky-200 hover:bg-sky-50 transition-colors">
              Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                {["Location", "pH", "Nitrates (mg/L)", "Hardness (mg/L)", "Turbidity (NTU)", "Score", "Last Tested"].map((h) => (
                  <th key={h} className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableRows.map((loc, i) => {
                const id = String(i);
                return (
                  <tr
                    key={i}
                    ref={(el) => { rowRefs.current[id] = el; }}
                    onClick={() => toggle(id)}
                    className={`cursor-pointer transition-colors ${
                      id === selectedId ? "bg-sky-50 outline outline-1 outline-sky-200" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-6 py-3.5 font-medium text-slate-700">{loc.name}</td>
                    <td className="px-6 py-3.5 text-slate-600">{loc.ph}</td>
                    <td className="px-6 py-3.5 text-slate-600">{loc.nitrates}</td>
                    <td className="px-6 py-3.5 text-slate-600">{loc.hardness}</td>
                    <td className="px-6 py-3.5 text-slate-600">{loc.turbidity}</td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${scoreColor(loc.score)}`}>
                        {loc.score} — {scoreLabel(loc.score)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">{loc.tested}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
