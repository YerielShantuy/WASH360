"use client";
import { useState, useEffect, useRef } from "react";
import { TrashMapLoader } from "./TrashMapLoader";
import type { TrashPoint } from "./TrashMap";

const CATEGORY_LABELS: Record<string, string> = {
  plastic_bottle: "Plastic Bottle", plastic_bag: "Plastic Bag",
  aluminium_can: "Aluminium Can",  paper_cup: "Paper Cup",
  styrofoam: "Styrofoam",          cigarette: "Cigarette Butt",
  glass_bottle: "Glass Bottle",    cardboard: "Cardboard",
  plastic_straw: "Straw",          plastic_other: "Other Plastic",
  paper: "Paper",                  rubber: "Rubber",
  foil: "Alum. Foil",              mask: "Face Mask",
  bottle_cap: "Bottle Cap",        rope: "Rope",
};

type SubRow = {
  id: string;
  category: string;
  status: string;
  ml_confidence: number;
  item_count: number;
  created_at: string;
};

function confidenceColor(c: number) {
  if (c >= 0.85) return "text-emerald-700 bg-emerald-100";
  if (c >= 0.6)  return "text-sky-700 bg-sky-100";
  return "text-amber-700 bg-amber-100";
}

function statusBadge(s: string) {
  const map: Record<string, string> = {
    verified: "bg-emerald-100 text-emerald-700",
    pending:  "bg-yellow-100 text-yellow-700",
    rejected: "bg-red-100 text-red-700",
  };
  return map[s] ?? map.pending;
}

interface Props {
  mapPoints: TrashPoint[];
  submissions: SubRow[];
}

export function TrashInteractive({ mapPoints, submissions }: Props) {
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
            <h2 className="text-base font-semibold text-slate-800">Submission Map</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click a pin <span className="text-slate-400">or</span> a row to highlight both
            </p>
          </div>
        </div>
        <div className="h-72">
          <TrashMapLoader points={mapPoints} selectedId={selectedId} onSelect={toggle} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Recent Submissions</h2>
          <div className="flex items-center gap-3">
            {selectedId && (
              <button
                onClick={() => setSelectedId(null)}
                className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors"
              >
                Clear selection ✕
              </button>
            )}
            <a
              href="/trash/export"
              className="text-sm text-sky-600 hover:text-sky-700 font-medium px-3 py-1.5 rounded-lg border border-sky-200 hover:bg-sky-50 transition-colors"
            >
              Export CSV
            </a>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                {["Category", "Items", "ML Confidence", "Status", "Submitted"].map((h) => (
                  <th key={h} className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.map((s) => (
                <tr
                  key={s.id}
                  ref={(el) => { rowRefs.current[s.id] = el; }}
                  onClick={() => toggle(s.id)}
                  className={`cursor-pointer transition-colors ${
                    s.id === selectedId ? "bg-sky-50 outline outline-1 outline-sky-200" : "hover:bg-slate-50"
                  }`}
                >
                  <td className="px-6 py-3.5 font-medium text-slate-700">
                    {CATEGORY_LABELS[s.category] ?? s.category}
                  </td>
                  <td className="px-6 py-3.5 text-slate-600">{s.item_count}</td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${confidenceColor(s.ml_confidence)}`}>
                      {Math.round(s.ml_confidence * 100)}%
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(s.status)}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-500">
                    {new Date(s.created_at).toLocaleDateString("en-AU", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
