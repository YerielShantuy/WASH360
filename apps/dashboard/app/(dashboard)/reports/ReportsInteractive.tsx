"use client";
import { useState, useEffect, useRef } from "react";
import { ReportsMapLoader } from "./ReportsMapLoader";
import { ReportActions } from "./ReportActions";
import type { ReportPoint } from "./ReportsMap";
import { Droplets } from "lucide-react";

type ReportStatus = "pending" | "acknowledged" | "resolved";
type ReportSeverity = "low" | "medium" | "high";
type ReportType = "flood" | "clogged_drain";

export type ReportRow = {
  id: string;
  report_type: ReportType;
  severity: ReportSeverity;
  description: string | null;
  status: ReportStatus;
  created_at: string;
};

const severityColor: Record<ReportSeverity, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

const statusColor: Record<ReportStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  acknowledged: "bg-blue-100 text-blue-700",
  resolved: "bg-emerald-100 text-emerald-700",
};

interface Props {
  reports: ReportRow[];
  mapPoints: ReportPoint[];
  useSeeded: boolean;
}

export function ReportsInteractive({ reports, mapPoints, useSeeded }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  // When map selects a point, scroll the matching row into view
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
            <h2 className="text-base font-semibold text-slate-800">Report Locations</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click a pin <span className="text-slate-400">or</span> a row to highlight both
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            {[{ label: "High", color: "#EF4444" }, { label: "Medium", color: "#F59E0B" }, { label: "Low", color: "#94A3B8" }].map(
              ({ label, color }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  {label}
                </span>
              )
            )}
          </div>
        </div>
        <div className="h-72">
          <ReportsMapLoader points={mapPoints} selectedId={selectedId} onSelect={toggle} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">All Reports</h2>
          <div className="flex items-center gap-3">
            {selectedId && (
              <button
                onClick={() => setSelectedId(null)}
                className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors"
              >
                Clear selection ✕
              </button>
            )}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Droplets size={14} className="text-sky-500" />
              <span>Live data</span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                {["Type", "Severity", "Description", "Submitted", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((r) => (
                <tr
                  key={r.id}
                  ref={(el) => { rowRefs.current[r.id] = el; }}
                  onClick={() => toggle(r.id)}
                  className={`cursor-pointer transition-colors ${
                    r.id === selectedId
                      ? "bg-sky-50 outline outline-1 outline-sky-200"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <td className="px-6 py-3.5 font-medium text-slate-700 capitalize whitespace-nowrap">
                    {r.report_type.replace("_", " ")}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${severityColor[r.severity]}`}>
                      {r.severity}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-500 max-w-xs truncate">
                    {r.description ?? <span className="text-slate-300 italic">No description</span>}
                  </td>
                  <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleDateString("en-AU", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-3.5" onClick={(e) => e.stopPropagation()}>
                    {useSeeded ? (
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[r.status]}`}>
                        {r.status}
                      </span>
                    ) : (
                      <ReportActions reportId={r.id} currentStatus={r.status} />
                    )}
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
