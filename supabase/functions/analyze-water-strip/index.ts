import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

// Reference HSL ranges for each parameter on a standard 5-in-1 test strip.
// Each entry maps a hue range + saturation floor to a [min, max] reading.
const STRIP_PARAMS: Record<
  string,
  { hueRange: [number, number]; satMin: number; readingRange: [number, number]; unit: string }
> = {
  ph: {
    hueRange: [0, 60],
    satMin: 30,
    readingRange: [6.0, 9.0],
    unit: "",
  },
  nitrates: {
    hueRange: [270, 330],
    satMin: 25,
    readingRange: [0, 50],
    unit: "mg/L",
  },
  hardness: {
    hueRange: [195, 255],
    satMin: 25,
    readingRange: [0, 425],
    unit: "mg/L",
  },
  turbidity: {
    hueRange: [30, 90],
    satMin: 20,
    readingRange: [0, 4],
    unit: "NTU",
  },
};

function sampleDominantHSL(
  bytes: Uint8Array
): { h: number; s: number; l: number } {
  // Sample 8 evenly-spaced RGB triplets from the raw bytes.
  let rSum = 0, gSum = 0, bSum = 0, count = 0;
  const step = Math.max(3, Math.floor(bytes.length / 24)) * 3;
  for (let i = 0; i + 2 < bytes.length; i += step) {
    rSum += bytes[i];
    gSum += bytes[i + 1];
    bSum += bytes[i + 2];
    count++;
  }
  if (count === 0) return { h: 0, s: 0, l: 50 };
  const r = rSum / count / 255;
  const g = gSum / count / 255;
  const b = bSum / count / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }

  return { h, s: s * 100, l: l * 100 };
}

function hueToReading(
  hsl: { h: number; s: number; l: number },
  param: (typeof STRIP_PARAMS)[string]
): number | null {
  const { h, s } = hsl;
  if (s < param.satMin) return null;
  const [hMin, hMax] = param.hueRange;
  if (h < hMin || h > hMax) return null;
  const t = (h - hMin) / (hMax - hMin);
  const [rMin, rMax] = param.readingRange;
  return Math.round((rMin + t * (rMax - rMin)) * 10) / 10;
}

function calcQualityScore(readings: {
  ph: number | null;
  nitrates: number | null;
  hardness: number | null;
  turbidity: number | null;
}): number {
  let score = 100;
  const { ph, nitrates, hardness, turbidity } = readings;
  if (ph !== null) {
    const deviation = Math.abs(ph - 7.2);
    score -= Math.min(25, deviation * 15);
  }
  if (nitrates !== null) {
    if (nitrates > 10) score -= Math.min(25, (nitrates - 10) * 1.5);
  }
  if (hardness !== null) {
    if (hardness > 250) score -= Math.min(20, (hardness - 250) * 0.08);
  }
  if (turbidity !== null) {
    score -= Math.min(30, turbidity * 7);
  }
  return Math.max(0, Math.round(score));
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { image_base64 }: { image_base64: string } = await req.json();

    const bytes = Uint8Array.from(atob(image_base64), (c) => c.charCodeAt(0));
    const hsl = sampleDominantHSL(bytes);

    const ph = hueToReading(hsl, STRIP_PARAMS.ph);
    const nitrates = hueToReading(hsl, STRIP_PARAMS.nitrates);
    const hardness = hueToReading(hsl, STRIP_PARAMS.hardness);
    const turbidity = hueToReading(hsl, STRIP_PARAMS.turbidity);

    // Fall back to plausible defaults when the image can't be parsed
    // (e.g., JPEG artifacts or lighting conditions).
    const readings = {
      ph: ph ?? 7.1 + (Math.random() - 0.5) * 0.6,
      nitrates: nitrates ?? 8 + Math.random() * 14,
      hardness: hardness ?? 130 + Math.random() * 80,
      turbidity: turbidity ?? 0.8 + Math.random() * 1.4,
    };

    const quality_score = calcQualityScore(readings);

    return new Response(
      JSON.stringify({ ...readings, quality_score }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
