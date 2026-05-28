"use client";
import dynamic from "next/dynamic";
import type { WaterQualityPoint } from "./WaterQualityMap";

const WaterQualityMap = dynamic(() => import("./WaterQualityMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-slate-100">
      <p className="text-sm text-slate-400">Loading map…</p>
    </div>
  ),
});

interface Props {
  points: WaterQualityPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

export function WaterQualityMapLoader({ points, selectedId, onSelect }: Props) {
  return <WaterQualityMap points={points} selectedId={selectedId} onSelect={onSelect} />;
}
