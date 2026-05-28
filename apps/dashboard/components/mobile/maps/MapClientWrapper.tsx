"use client";
import dynamic from "next/dynamic";
import type { MapPin } from "./LeafletMap";

const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false });

export default function MapClientWrapper({ pins }: { pins: MapPin[] }) {
  return (
    <div className="relative w-full h-[calc(100dvh-80px)]">
      <LeafletMap pins={pins} />
    </div>
  );
}
