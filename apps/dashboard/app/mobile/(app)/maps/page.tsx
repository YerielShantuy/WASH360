import { createServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import type { MapPin, BingoPolygon } from "@/components/mobile/maps/LeafletMap";
import MapClientWrapper from "@/components/mobile/maps/MapClientWrapper";

// Sydney-based handwash stations, bingo zones, and water quality points
const DEMO_PINS: MapPin[] = [
  {
    id: "m1", lat: -33.8908, lng: 151.2743, type: "module",
    title: "Bondi Beach Handwash Station",
    subtitle: "Near the main pavilion, Bondi Beach",
    description: "Solar-powered WHO-certified handwash module. NFC-enabled. Open 6am–8pm daily.",
    ctaLabel: "Start Handwashing", ctaHref: "/mobile/handwashing/demo-module", status: "online",
  },
  {
    id: "m2", lat: -33.7972, lng: 151.2863, type: "module",
    title: "Manly Beach Wash Module",
    subtitle: "Manly Corso entrance, Manly",
    description: "Community-funded station. Serves the Manly boardwalk area. Average 120 uses/day.",
    ctaLabel: "Start Handwashing", ctaHref: "/mobile/handwashing/demo-module-2", status: "online",
  },
  {
    id: "m3", lat: -33.8688, lng: 151.2093, type: "module",
    title: "Hyde Park Wash Point",
    subtitle: "Hyde Park North, Sydney CBD",
    description: "CBD central station near the Archibald Fountain. Wheelchair accessible.",
    ctaLabel: "Start Handwashing", ctaHref: "/mobile/handwashing/demo-module-3", status: "online",
  },
  {
    id: "m4", lat: -33.8732, lng: 151.2010, type: "module",
    title: "Darling Harbour Station",
    subtitle: "Cockle Bay Wharf promenade",
    description: "High-traffic tourist area. Maintained by City of Sydney Council.",
    ctaLabel: "Start Handwashing", ctaHref: "/mobile/handwashing/demo-module-4", status: "maintenance",
  },
  {
    id: "b1", lat: -33.8908, lng: 151.2743, type: "bingo_zone",
    title: "Bondi Beach Bingo Zone",
    subtitle: "Beach + coastal trail · 8 items left",
    description: "Coastal cleanup zone covering Bondi Beach and the cliff walk to Tamarama. Focus: plastic, cigarette butts, netting.",
    ctaLabel: "Play Bingo", ctaHref: "/mobile/bingo?zone=bondi-zone",
  },
  {
    id: "b2", lat: -33.9192, lng: 151.2523, type: "bingo_zone",
    title: "Coogee Beach Bingo Zone",
    subtitle: "Coogee Beach · Active",
    description: "Popular family beach zone. Known for food wrapper and styrofoam waste. Marine debris focus.",
    ctaLabel: "Play Bingo", ctaHref: "/mobile/bingo?zone=coogee-zone",
  },
  {
    id: "b3", lat: -33.7972, lng: 151.2863, type: "bingo_zone",
    title: "Manly Cove Bingo Zone",
    subtitle: "Manly Cove foreshore · 12 items left",
    description: "Foreshore and harbour beach zone. Fishing line, bottle caps, and straws are common finds here.",
    ctaLabel: "Play Bingo", ctaHref: "/mobile/bingo?zone=manly-zone",
  },
  {
    id: "b4", lat: -33.9840, lng: 151.2320, type: "bingo_zone",
    title: "La Perouse Bingo Zone",
    subtitle: "Botany Bay coastline · Active",
    description: "Historic coastal reserve zone. Rich in marine debris. Rubber, glass shards, and netting common.",
    ctaLabel: "Play Bingo", ctaHref: "/mobile/bingo?zone=laperouse-zone",
  },
  {
    id: "w1", lat: -33.8523, lng: 151.2108, type: "water_quality",
    title: "Parramatta River Monitor",
    subtitle: "Score: 61/100 · Fair quality",
    description: "Tidal river with moderate industrial influence. pH 7.1, turbidity moderate. Improve drainage upstream recommended.",
    ctaLabel: "View Report",
  },
  {
    id: "w2", lat: -33.8560, lng: 151.2101, type: "water_quality",
    title: "Sydney Harbour Tap",
    subtitle: "Score: 83/100 · Good quality",
    description: "CBD harbour tap water. Chlorinated and filtered. pH 7.4, clear turbidity. Safe for drinking.",
    ctaLabel: "View Report",
  },
  {
    id: "w3", lat: -33.9200, lng: 151.2300, type: "water_quality",
    title: "Botany Bay Station",
    subtitle: "Score: 54/100 · Fair quality",
    description: "Coastal bay monitor near La Perouse. Salinity elevated. Not suitable for drinking. Swim advisory active.",
    ctaLabel: "View Report",
  },
];

// Approximate beach/coastal polygons for Sydney bingo zones
const BINGO_POLYGONS: BingoPolygon[] = [
  {
    id: "bondi-zone",
    label: "Bondi Beach Zone",
    color: "#F59E0B",
    coords: [
      [-33.8855, 151.2693],
      [-33.8855, 151.2800],
      [-33.8960, 151.2800],
      [-33.8960, 151.2693],
    ],
  },
  {
    id: "coogee-zone",
    label: "Coogee Beach Zone",
    color: "#F59E0B",
    coords: [
      [-33.9150, 151.2490],
      [-33.9150, 151.2570],
      [-33.9240, 151.2570],
      [-33.9240, 151.2490],
    ],
  },
  {
    id: "manly-zone",
    label: "Manly Cove Zone",
    color: "#F59E0B",
    coords: [
      [-33.7930, 151.2820],
      [-33.7930, 151.2910],
      [-33.8020, 151.2910],
      [-33.8020, 151.2820],
    ],
  },
  {
    id: "laperouse-zone",
    label: "La Perouse Zone",
    color: "#F59E0B",
    coords: [
      [-33.9800, 151.2270],
      [-33.9800, 151.2380],
      [-33.9890, 151.2380],
      [-33.9890, 151.2270],
    ],
  },
];

export default async function MapsPage() {
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/mobile/sign-in");

  let pins: MapPin[] = DEMO_PINS;

  try {
    const { data: modules } = await (supabase as any)
      .from("modules")
      .select("id, venue_name, venue_type, status, latitude, longitude")
      .eq("status", "online")
      .limit(20) as { data: { id: string; venue_name: string; venue_type: string; status: string; latitude: number | null; longitude: number | null }[] | null };

    if (modules && modules.length > 0 && modules[0].latitude) {
      const livePins: MapPin[] = modules
        .filter((m) => m.latitude && m.longitude)
        .map((m) => ({
          id: m.id,
          lat: m.latitude!,
          lng: m.longitude!,
          type: "module" as const,
          title: m.venue_name,
          subtitle: m.venue_type,
          description: `Status: ${m.status}`,
          ctaLabel: "Start Handwashing",
          ctaHref: `/mobile/handwashing/${m.id}`,
          status: m.status,
        }));
      if (livePins.length > 0) pins = [...livePins, ...DEMO_PINS.filter((p) => p.type !== "module")];
    }
  } catch {}

  return <MapClientWrapper pins={pins} polygons={BINGO_POLYGONS} />;
}
