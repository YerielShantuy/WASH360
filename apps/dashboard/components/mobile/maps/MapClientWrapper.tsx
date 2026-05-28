"use client";
import dynamic from "next/dynamic";
import type { MapPin, BingoPolygon } from "./LeafletMap";

const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false });

export default function MapClientWrapper({ pins, polygons }: { pins: MapPin[]; polygons?: BingoPolygon[] }) {
  return (
    <div className="relative w-full h-[calc(100dvh-80px)]">
      <LeafletMap pins={pins} polygons={polygons} />
    </div>
  );
}
