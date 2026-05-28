"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LMap } from "leaflet";
import { Drawer } from "vaul";
import { motion } from "framer-motion";
import { Navigation } from "lucide-react";

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  type: "module" | "bingo_zone" | "water_quality";
  title: string;
  subtitle: string;
  description?: string;
  ctaLabel: string;
  ctaHref?: string;
  status?: string;
};

export type BingoPolygon = {
  id: string;
  label: string;
  color: string;
  coords: [number, number][]; // [lat, lng] pairs
};

type Props = { pins: MapPin[]; polygons?: BingoPolygon[] };

const spring = { type: "spring" as const, stiffness: 200, damping: 15 };

const LAYER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "module", label: "Wash Modules" },
  { id: "bingo_zone", label: "Bingo Zones" },
  { id: "water_quality", label: "Water Quality" },
] as const;

type LayerId = typeof LAYER_OPTIONS[number]["id"];

const PIN_COLORS: Record<MapPin["type"], string> = {
  module: "#0284C7",
  bingo_zone: "#F59E0B",
  water_quality: "#10B981",
};

const PIN_LABELS: Record<MapPin["type"], string> = {
  module: "💧",
  bingo_zone: "🎯",
  water_quality: "🔬",
};

// Sydney CBD default center
const DEFAULT_CENTER: [number, number] = [-33.8688, 151.2093];

export default function LeafletMap({ pins, polygons = [] }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const polygonLayersRef = useRef<unknown[]>([]);
  const [layer, setLayer] = useState<LayerId>("all");
  const [selected, setSelected] = useState<MapPin | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    import("leaflet").then((L) => {
      const map = L.map(mapContainerRef.current!, {
        center: DEFAULT_CENTER,
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      // Center on device location immediately
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 14),
          () => map.setView(DEFAULT_CENTER, 12)
        );
      }

      // Draw bingo zone polygons
      polygons.forEach((poly) => {
        const leafletPoly = L.polygon(poly.coords as [number, number][], {
          color: poly.color,
          fillColor: poly.color,
          fillOpacity: 0.12,
          weight: 2,
          dashArray: "6 4",
        }).addTo(map);

        const label = L.divIcon({
          html: `<div style="background:${poly.color};color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.2)">${poly.label}</div>`,
          className: "",
          iconAnchor: [0, 0],
        });

        const center = poly.coords.reduce(
          (acc, c) => [acc[0] + c[0] / poly.coords.length, acc[1] + c[1] / poly.coords.length],
          [0, 0]
        ) as [number, number];

        L.marker(center, { icon: label }).addTo(map);
        polygonLayersRef.current.push(leafletPoly);
      });
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-render pin markers when layer or pins change
  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then((L) => {
      const map = mapRef.current!;

      map.eachLayer((l) => {
        if ((l as unknown as { _pinMarker?: boolean })._pinMarker) map.removeLayer(l);
      });

      const filtered = layer === "all" ? pins : pins.filter((p) => p.type === layer);

      filtered.forEach((pin) => {
        const color = PIN_COLORS[pin.type];
        const emoji = PIN_LABELS[pin.type];

        const icon = L.divIcon({
          html: `<div style="
            width:40px;height:40px;border-radius:50% 50% 50% 0;
            background:${color};transform:rotate(-45deg);
            box-shadow:0 2px 8px rgba(0,0,0,0.25);
            display:flex;align-items:center;justify-content:center;
          "><span style="transform:rotate(45deg);font-size:16px">${emoji}</span></div>`,
          className: "",
          iconSize: [40, 40],
          iconAnchor: [20, 40],
        });

        const marker = L.marker([pin.lat, pin.lng], { icon });
        (marker as unknown as { _pinMarker: boolean })._pinMarker = true;
        marker.addTo(map);
        marker.on("click", () => { setSelected(pin); setDrawerOpen(true); });
      });
    });
  }, [layer, pins]);

  function goToMyLocation() {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 15);
        setLocating(false);
      },
      () => setLocating(false)
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {/* Layer filter chips */}
      <div className="absolute top-4 left-0 right-0 px-4 flex gap-2 overflow-x-auto scrollbar-none z-10 pointer-events-none">
        <div className="flex gap-2 pointer-events-auto">
          {LAYER_OPTIONS.map((opt) => (
            <motion.button
              key={opt.id}
              whileTap={{ scale: 0.94 }}
              transition={spring}
              onClick={() => setLayer(opt.id as LayerId)}
              className={`flex-none px-3 py-1.5 rounded-full text-xs font-bold shadow-md transition-colors ${
                layer === opt.id ? "bg-sky-600 text-white" : "bg-white text-slate-700"
              }`}
            >
              {opt.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute right-4 bottom-32 flex flex-col gap-2 z-10">
        <button
          onClick={goToMyLocation}
          disabled={locating}
          className="w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center"
        >
          <Navigation size={18} className={locating ? "text-sky-500 animate-pulse" : "text-slate-600"} />
        </button>
        {["+", "−"].map((label) => (
          <button
            key={label}
            onClick={() => label === "+" ? mapRef.current?.zoomIn() : mapRef.current?.zoomOut()}
            className="w-10 h-10 bg-white rounded-xl shadow-md text-slate-700 font-bold text-lg flex items-center justify-center"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bingo polygon legend */}
      {(layer === "all" || layer === "bingo_zone") && polygons.length > 0 && (
        <div className="absolute left-4 bottom-32 z-10 bg-white/90 backdrop-blur-sm rounded-xl p-2 shadow-md">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-2 rounded border-2 border-dashed border-amber-400 bg-amber-400/20" />
            <span className="text-[10px] font-bold text-slate-600">Bingo Zone</span>
          </div>
        </div>
      )}

      {/* Pin detail drawer */}
      <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Drawer.Content className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-white rounded-t-[32px] shadow-[0_-8px_30px_rgba(2,132,199,0.15)] p-6 pb-safe focus:outline-none">
            <div className="w-10 h-1.5 bg-slate-200 rounded-full mx-auto mb-5" />
            {selected && (
              <>
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-none"
                    style={{ backgroundColor: PIN_COLORS[selected.type] + "20" }}
                  >
                    {PIN_LABELS[selected.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-black text-lg text-slate-900 leading-tight">{selected.title}</h2>
                    <p className="text-slate-400 text-sm mt-0.5">{selected.subtitle}</p>
                    {selected.status && (
                      <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                        selected.status === "online" ? "bg-emerald-100 text-emerald-700" :
                        selected.status === "maintenance" ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {selected.status}
                      </span>
                    )}
                  </div>
                </div>
                {selected.description && (
                  <p className="text-slate-500 text-sm leading-relaxed mb-4">{selected.description}</p>
                )}
                {selected.ctaHref && (
                  <motion.a
                    href={selected.ctaHref}
                    whileTap={{ scale: 0.96 }}
                    transition={spring}
                    className="flex w-full h-[52px] rounded-[20px] bg-sky-600 text-white font-black text-base shadow-[0px_4px_0px_rgba(0,0,0,0.12),0px_8px_20px_rgba(2,132,199,0.25)] items-center justify-center"
                  >
                    {selected.ctaLabel}
                  </motion.a>
                )}
              </>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
