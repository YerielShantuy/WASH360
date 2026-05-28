"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import MapGL, { NavigationControl, Popup } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";

export type ReportPoint = {
  id: string;
  lat: number;
  lng: number;
  severity: string;
  report_type: string;
};

function markerColor(severity: string) {
  if (severity === "high") return "#EF4444";
  if (severity === "medium") return "#F59E0B";
  return "#94A3B8";
}

interface Props {
  points: ReportPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

export default function ReportsMap({ points, selectedId, onSelect }: Props) {
  const mapRef = useRef<MapRef>(null);
  const markersRef = useRef<Map<string, { marker: maplibregl.Marker; el: HTMLElement }>>(new Map());
  const [popup, setPopup] = useState<ReportPoint | null>(null);

  function styleMarker(el: HTMLElement, selected: boolean) {
    el.style.width = selected ? "22px" : "14px";
    el.style.height = selected ? "22px" : "14px";
    el.style.border = selected ? "3px solid #0f172a" : "2px solid #fff";
    el.style.boxShadow = selected
      ? "0 0 0 4px rgba(15,23,42,0.15), 0 2px 8px rgba(0,0,0,0.5)"
      : "0 1px 5px rgba(0,0,0,0.4)";
    el.style.zIndex = selected ? "10" : "1";
  }

  const onLoad = useCallback(() => {
    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = new Map();

    points.forEach((p) => {
      const el = document.createElement("div");
      el.style.cssText = `
        width: 14px; height: 14px; border-radius: 50%;
        background-color: ${markerColor(p.severity)};
        border: 2px solid #fff;
        box-shadow: 0 1px 5px rgba(0,0,0,0.4);
        cursor: pointer;
        transition: all 0.15s ease;
      `;
      styleMarker(el, p.id === selectedId);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelect?.(p.id);
        setPopup(p);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([p.lng, p.lat])
        .addTo(mapRef.current!.getMap());

      markersRef.current.set(p.id, { marker, el });
    });
  }, [points, onSelect]); // eslint-disable-line react-hooks/exhaustive-deps

  // React to external selectedId changes
  useEffect(() => {
    markersRef.current.forEach(({ el }, id) => styleMarker(el, id === selectedId));
    if (!selectedId || !mapRef.current) return;
    const point = points.find((p) => p.id === selectedId);
    if (!point) return;
    setPopup(point);
    mapRef.current.getMap().flyTo({
      center: [point.lng, point.lat],
      zoom: Math.max(mapRef.current.getMap().getZoom(), 13),
      duration: 600,
    });
  }, [selectedId, points]);

  return (
    <MapGL
      ref={mapRef}
      initialViewState={{ longitude: 151.21, latitude: -33.87, zoom: 11 }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      onLoad={onLoad}
    >
      <NavigationControl position="top-right" showCompass={false} />
      {popup && (
        <Popup longitude={popup.lng} latitude={popup.lat} onClose={() => setPopup(null)} closeOnClick={false} offset={14}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, textTransform: "capitalize" }}>
            {popup.report_type.replace("_", " ")}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "#64748b", textTransform: "capitalize" }}>
            Severity: {popup.severity}
          </p>
        </Popup>
      )}
    </MapGL>
  );
}
