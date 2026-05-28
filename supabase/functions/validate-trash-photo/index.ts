import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

// TACO dataset category → bingo cell category mapping
const TACO_TO_BINGO: Record<string, string> = {
  "Plastic bottle": "plastic_bottle",
  "Plastic bag & wrapper": "plastic_bag",
  "Drink can": "aluminium_can",
  "Food Can": "aluminium_can",
  "Paper cup": "paper_cup",
  "Styrofoam piece": "styrofoam",
  "Cigarette": "cigarette",
  "Glass bottle": "glass_bottle",
  "Carton": "cardboard",
  "Newspaper & magazine": "paper",
  "Blister pack": "plastic_other",
  "Plastic container": "plastic_other",
  "Straw": "plastic_straw",
};

interface VisionLabel {
  description: string;
  score: number;
  topicality?: number;
}

interface VisionResponse {
  responses: Array<{
    labelAnnotations?: VisionLabel[];
    error?: { message: string };
  }>;
}

async function callGoogleVision(
  base64Image: string,
  apiKey: string
): Promise<VisionLabel[]> {
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: "LABEL_DETECTION", maxResults: 15 }],
          },
        ],
      }),
    }
  );
  if (!res.ok) throw new Error(`Vision API HTTP ${res.status}`);
  const json: VisionResponse = await res.json();
  if (json.responses[0]?.error) throw new Error(json.responses[0].error.message);
  return json.responses[0]?.labelAnnotations ?? [];
}

function matchCategory(labels: VisionLabel[]): {
  category: string | null;
  confidence: number;
  item_count: number;
} {
  let bestCategory: string | null = null;
  let bestConfidence = 0;

  for (const label of labels) {
    const mapped = TACO_TO_BINGO[label.description];
    if (mapped && label.score > bestConfidence) {
      bestCategory = mapped;
      bestConfidence = label.score;
    }
  }

  // Fallback: check for generic waste keywords
  if (!bestCategory) {
    const wasteKeywords = ["trash", "waste", "litter", "garbage", "rubbish", "debris"];
    for (const label of labels) {
      if (wasteKeywords.some((kw) => label.description.toLowerCase().includes(kw))) {
        bestCategory = "plastic_other";
        bestConfidence = label.score * 0.8;
        break;
      }
    }
  }

  // Estimate item count from "quantity" / "several" / number labels
  let item_count = 1;
  for (const label of labels) {
    const desc = label.description.toLowerCase();
    if (desc.includes("several") || desc.includes("multiple") || desc.includes("pile")) {
      item_count = 3;
      break;
    }
    if (desc.includes("many") || desc.includes("lots")) {
      item_count = 5;
      break;
    }
  }

  return { category: bestCategory, confidence: bestConfidence, item_count };
}

// Local fallback when no API key is configured (dev / demo mode).
// Returns a plausible result based on a hash of the image bytes.
function localFallback(base64Image: string): {
  category: string;
  confidence: number;
  item_count: number;
} {
  const categories = Object.values(TACO_TO_BINGO);
  const bytes = Uint8Array.from(atob(base64Image.slice(0, 400)), (c) =>
    c.charCodeAt(0)
  );
  const hash = bytes.reduce((a, b) => (a * 31 + b) & 0xffff, 0);
  const category = categories[hash % categories.length];
  const confidence = 0.72 + (hash % 20) / 100;
  return { category, confidence, item_count: 1 };
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const {
      image_base64,
      expected_category,
    }: {
      image_base64: string;
      expected_category?: string;
    } = await req.json();

    const apiKey = Deno.env.get("GOOGLE_VISION_API_KEY");

    let result: { category: string | null; confidence: number; item_count: number };

    if (apiKey) {
      const labels = await callGoogleVision(image_base64, apiKey);
      result = matchCategory(labels);
    } else {
      result = localFallback(image_base64);
    }

    const MIN_CONFIDENCE = 0.6;
    const categoryMatches =
      !expected_category || result.category === expected_category;
    const isValid =
      result.category !== null &&
      result.confidence >= MIN_CONFIDENCE &&
      categoryMatches;

    return new Response(
      JSON.stringify({
        is_valid: isValid,
        category: result.category,
        confidence: result.confidence,
        item_count: result.item_count,
        reason: isValid
          ? "ok"
          : result.category === null
          ? "no_trash_detected"
          : result.confidence < MIN_CONFIDENCE
          ? "low_confidence"
          : "category_mismatch",
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
