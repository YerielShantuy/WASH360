import { createServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import type { MapPin } from "@/components/mobile/maps/LeafletMap";
import MapClientWrapper from "@/components/mobile/maps/MapClientWrapper";

// Demo seed pins for when DB has no geo data yet
const DEMO_PINS: MapPin[] = [
  { id: "m1", lat: -6.2088, lng: 106.8456, type: "module", title: "Monas Handwash Station", subtitle: "Jl. Medan Merdeka Barat", ctaLabel: "Start Handwashing", ctaHref: "/mobile/handwashing/demo-module", status: "online" },
  { id: "m2", lat: -6.1944, lng: 106.8229, type: "module", title: "Kota Tua Wash Module", subtitle: "Museum Fatahillah Area", ctaLabel: "Start Handwashing", ctaHref: "/mobile/handwashing/demo-module-2", status: "online" },
  { id: "b1", lat: -6.2297, lng: 106.8290, type: "bingo_zone", title: "Senen Bingo Zone", subtitle: "Pasar Senen · 5 items left", ctaLabel: "Play Bingo", ctaHref: "/mobile/bingo?zone=senen-zone" },
  { id: "b2", lat: -6.1751, lng: 106.8650, type: "bingo_zone", title: "Kemayoran Zone", subtitle: "JIExpo Area · Active", ctaLabel: "Play Bingo", ctaHref: "/mobile/bingo?zone=kemayoran-zone" },
  { id: "w1", lat: -6.2615, lng: 106.8106, type: "water_quality", title: "Kali Grogol Reading", subtitle: "Score: 72/100 · Moderate", ctaLabel: "View Details" },
  { id: "w2", lat: -6.2170, lng: 106.9008, type: "water_quality", title: "PAM Cililitan", subtitle: "Score: 91/100 · Good", ctaLabel: "View Details" },
];

export default async function MapsPage() {
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/mobile/sign-in");

  // Attempt to load live module data; fall back to demo pins if empty/error
  let pins: MapPin[] = DEMO_PINS;

  try {
    const { data: modules } = await (supabase as any)
      .from("modules")
      .select("id, venue_name, venue_type, status")
      .eq("status", "online")
      .limit(20) as { data: { id: string; venue_name: string; venue_type: string; status: string }[] | null };

    if (modules && modules.length > 0) {
      pins = modules.map((m, i) => ({
        id: m.id,
        lat: -6.2088 + (i * 0.01),
        lng: 106.8456 + (i * 0.008),
        type: "module" as const,
        title: m.venue_name,
        subtitle: m.venue_type,
        ctaLabel: "Start Handwashing",
        ctaHref: `/mobile/handwashing/${m.id}`,
        status: m.status,
      }));
    }
  } catch {
    // Keep demo pins
  }

  return <MapClientWrapper pins={pins} />;
}
