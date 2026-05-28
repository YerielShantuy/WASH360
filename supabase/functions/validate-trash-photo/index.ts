import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

// Keywords matched against Google Vision labels (case-insensitive substring)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Plastic Bottle":  ["bottle", "plastic bottle", "water bottle", "beverage bottle", "soda bottle", "pet bottle"],
  "Food Wrapper":    ["wrapper", "snack", "food packaging", "candy", "cellophane", "packaging", "sachet", "chips"],
  "Cigarette Butt":  ["cigarette", "tobacco", "smoking", "cigarette butt", "filter tip", "ashtray"],
  "Glass Shard":     ["glass", "shard", "broken glass", "glass fragment", "glass bottle"],
  "Styrofoam":       ["styrofoam", "polystyrene", "expanded polystyrene", "eps"],
  "Cardboard":       ["cardboard", "carton", "corrugated", "paperboard", "cardboard box"],
  "Metal Can":       ["can", "tin", "aluminum can", "aluminium can", "beverage can", "drink can", "soda can"],
  "Plastic Bag":     ["bag", "plastic bag", "shopping bag", "carrier bag", "poly bag", "grocery bag"],
  "Paper Cup":       ["cup", "paper cup", "disposable cup", "coffee cup", "takeaway cup"],
  "Rubber":          ["rubber", "tire", "tyre", "rubber band", "latex", "elastic"],
  "Nappy/Diaper":    ["diaper", "nappy", "baby", "absorbent", "pampers"],
  "Straw":           ["straw", "drinking straw", "plastic straw"],
  "Bottle Cap":      ["cap", "lid", "bottle cap", "closure", "stopper", "crown cap"],
  "Tin Foil":        ["foil", "aluminum foil", "aluminium foil", "tin foil", "cooking foil"],
  "Foam Container":  ["container", "foam container", "takeaway box", "takeout", "clamshell", "food container"],
  "Fishing Line":    ["fishing", "fishing line", "fishing net", "monofilament", "rope", "cord", "net"],
  "Extra Trash":     ["trash", "waste", "litter", "garbage", "rubbish", "debris", "refuse", "pollution"],
};

// Any of these in Vision labels = something that looks like trash was detected
const GENERAL_WASTE = [
  "trash", "waste", "litter", "garbage", "rubbish", "debris", "pollution",
  "disposable", "single-use", "refuse", "recycle", "recyclable",
];

interface VisionLabel    { description: string; score: number }
interface VisionObject   { name: string; score: number; boundingPoly?: { normalizedVertices: { x: number; y: number }[] } }
interface VisionResponse {
  responses: Array<{
    labelAnnotations?:        VisionLabel[];
    localizedObjectAnnotations?: VisionObject[];
    error?: { message: string };
  }>;
}

async function callGoogleVision(base64Image: string, apiKey: string): Promise<{
  labels:   VisionLabel[];
  objects:  VisionObject[];
}> {
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Image },
          features: [
            { type: "LABEL_DETECTION",    maxResults: 20 },
            { type: "OBJECT_LOCALIZATION", maxResults: 10 },
          ],
        }],
      }),
    }
  );
  if (!res.ok) throw new Error(`Vision API HTTP ${res.status}`);
  const json: VisionResponse = await res.json();
  const r = json.responses[0];
  if (r?.error) throw new Error(r.error.message);
  return {
    labels:  r?.labelAnnotations            ?? [],
    objects: r?.localizedObjectAnnotations  ?? [],
  };
}

function matchCategory(
  labels:   VisionLabel[],
  objects:  VisionObject[],
  expected: string
): { matched: boolean; confidence: number; bounding_box: object | null } {
  const keywords = CATEGORY_KEYWORDS[expected] ?? [];

  // Combine labels + object names into a single scored list
  const allDetections: { text: string; score: number }[] = [
    ...labels.map(l  => ({ text: l.description.toLowerCase(), score: l.score })),
    ...objects.map(o => ({ text: o.name.toLowerCase(),         score: o.score })),
  ];

  // Find the highest-confidence label that matches any keyword
  let bestScore = 0;
  for (const kw of keywords) {
    for (const d of allDetections) {
      if (d.text.includes(kw.toLowerCase()) && d.score > bestScore) {
        bestScore = d.score;
      }
    }
  }

  // For Extra Trash: accept any general waste label
  if (expected === "Extra Trash" && bestScore === 0) {
    for (const gw of GENERAL_WASTE) {
      for (const d of allDetections) {
        if (d.text.includes(gw) && d.score > bestScore) bestScore = d.score;
      }
    }
  }

  // Also accept if ANY label indicates this is trash (safety net)
  let isTrash = bestScore > 0;
  if (!isTrash) {
    for (const gw of GENERAL_WASTE) {
      if (allDetections.some(d => d.text.includes(gw) && d.score > 0.5)) {
        isTrash = true;
        bestScore = Math.max(bestScore, 0.55);
        break;
      }
    }
  }

  // Pull bounding box from the best matching localised object (if any)
  let bounding_box: object | null = null;
  for (const kw of keywords) {
    const obj = objects.find(o => o.name.toLowerCase().includes(kw.toLowerCase()));
    if (obj?.boundingPoly) {
      bounding_box = obj.boundingPoly.normalizedVertices;
      break;
    }
  }

  return { matched: bestScore > 0, confidence: bestScore, bounding_box };
}

// Deterministic-ish fallback for when no API key is set (dev/demo).
function localFallback(base64Image: string, expected: string): {
  matched: boolean; confidence: number; bounding_box: null;
} {
  const bytes = Uint8Array.from(atob(base64Image.slice(0, 400)), c => c.charCodeAt(0));
  const hash = bytes.reduce((a, b) => (a * 31 + b) & 0xffff, 0);
  const confidence = 0.65 + (hash % 25) / 100;
  // ~70% acceptance rate in fallback mode
  const matched = (hash % 10) < 7;
  void expected;
  return { matched, confidence, bounding_box: null };
}

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { image_base64, expected_category = "Extra Trash" }: {
      image_base64: string;
      expected_category?: string;
    } = await req.json();

    if (!image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_VISION_API_KEY");
    const MIN_CONFIDENCE = 0.55;

    let matched: boolean;
    let confidence: number;
    let bounding_box: object | null;

    if (apiKey) {
      const { labels, objects } = await callGoogleVision(image_base64, apiKey);
      ({ matched, confidence, bounding_box } = matchCategory(labels, objects, expected_category));
    } else {
      ({ matched, confidence, bounding_box } = localFallback(image_base64, expected_category));
    }

    const accepted = matched && confidence >= MIN_CONFIDENCE;

    return new Response(
      JSON.stringify({
        accepted,
        is_valid:     accepted,             // legacy alias
        category:     expected_category,
        confidence,
        bounding_box,
        reason: accepted
          ? "ok"
          : !matched
          ? "no_trash_detected"
          : "low_confidence",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
