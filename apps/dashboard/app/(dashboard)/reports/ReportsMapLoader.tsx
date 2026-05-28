"use client";
import dynamic from "next/dynamic";
import type { ReportPoint } from "./ReportsMap";

const ReportsMap = dynamic(() => import("./ReportsMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-slate-100">
      <p className="text-sm text-slate-400">Loading map…</p>
    </div>
  ),
});

interface Props {
  points: ReportPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

export function ReportsMapLoader({ points, selectedId, onSelect }: Props) {
  return <ReportsMap points={points} selectedId={selectedId} onSelect={onSelect} />;
}
