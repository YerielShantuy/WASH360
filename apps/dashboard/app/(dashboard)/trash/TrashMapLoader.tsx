"use client";
import dynamic from "next/dynamic";
import type { TrashPoint } from "./TrashMap";

const TrashMap = dynamic(() => import("./TrashMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-slate-100">
      <p className="text-sm text-slate-400">Loading map…</p>
    </div>
  ),
});

interface Props {
  points: TrashPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

export function TrashMapLoader({ points, selectedId, onSelect }: Props) {
  return <TrashMap points={points} selectedId={selectedId} onSelect={onSelect} />;
}
