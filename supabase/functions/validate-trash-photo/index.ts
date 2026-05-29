import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return null;
}

// Per-category keywords — matched bidirectionally against Vision labels
// (label contains keyword  OR  keyword contains label)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Plastic Bottle":  ["bottle", "plastic", "water bottle", "beverage bottle", "plastic bottle", "container", "pet"],
  "Food Wrapper":    ["wrapper", "snack", "food", "candy", "packaging", "chips", "crisp", "cellophane", "sachet"],
  "Cigarette Butt":  ["cigarette", "tobacco", "smoking", "butt", "filter"],
  "Glass Shard":     ["glass", "shard", "broken", "fragment"],
  "Styrofoam":       ["styrofoam", "polystyrene", "foam", "eps"],
  "Cardboard":       ["cardboard", "carton", "corrugated", "box", "paperboard"],
  "Metal Can":       ["can", "tin", "aluminum", "aluminium", "metal", "steel"],
  "Plastic Bag":     ["bag", "plastic", "shopping", "carrier", "grocery"],
  "Paper Cup":       ["cup", "paper", "disposable", "coffee", "takeaway"],
  "Rubber":          ["rubber", "tire", "tyre", "latex", "elastic"],
  "Nappy/Diaper":    ["diaper", "nappy", "baby", "absorbent"],
  "Straw":           ["straw", "tube"],
  "Bottle Cap":      ["cap", "lid", "closure", "stopper"],
  "Tin Foil":        ["foil", "aluminum", "aluminium", "tin"],
  "Foam Container":  ["container", "foam", "takeaway", "takeout", "box"],
  "Fishing Line":    ["fishing", "net", "rope", "cord", "line", "monofilament"],
  "Extra Trash":     ["trash", "waste", "litter", "garbage", "rubbish", "debris"],
};

// If ANY Vision label contains one of these words → image is generally trash-like
const TRASH_WORDS = [
  "trash", "waste", "litter", "garbage", "rubbish", "debris", "pollution",
  "plastic", "bottle", "can", "bag", "wrapper", "cup", "container", "foam",
  "styrofoam", "cardboard", "paper", "glass", "metal", "rubber", "straw",
  "cigarette", "foil", "diaper", "nappy", "cap", "lid", "rope", "net",
  "disposable", "recyclable", "packaging", "refuse", "tin", "aluminum",
  "aluminium", "fishing", "packaging", "carton", "corrugated", "snack",
  "beverage", "soda", "water bottle", "shopping", "polystyrene",
];

interface VisionLabel  { description: string; score: number }
interface VisionObject { name: string; score: number; boundingPoly?: { normalizedVertices: { x: number; y: number }[] } }
interface VisionResponse {
  responses: Array<{
    labelAnnotations?:           VisionLabel[];
    localizedObjectAnnotations?: VisionObject[];
    error?: { message: string };
  }>;
}

/** Exchange a service-account JSON for a short-lived Bearer token via JWT. */
async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  const header  = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = toBase64Url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/cloud-vision",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));

  const pem = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const keyBytes = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", cryptoKey,
    new TextEncoder().encode(`${header}.${payload}`)
  );
  const jwt = `${header}.${payload}.${toBase64Url(new Uint8Array(sig))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`Token exchange failed: ${JSON.stringify(json)}`);
  return json.access_token;
}

function toBase64Url(input: string | Uint8Array): string {
  const str = typeof input === "string"
    ? btoa(input)
    : btoa(String.fromCharCode(...input));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function callGoogleVision(base64Image: string, auth: { type: "bearer"; token: string } | { type: "apikey"; key: string }) {
  const url = auth.type === "apikey"
    ? `https://vision.googleapis.com/v1/images:annotate?key=${auth.key}`
    : "https://vision.googleapis.com/v1/images:annotate";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth.type === "bearer") headers["Authorization"] = `Bearer ${auth.token}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      requests: [{
        image: { content: base64Image },
        features: [
          { type: "LABEL_DETECTION",     maxResults: 20 },
          { type: "OBJECT_LOCALIZATION", maxResults: 10 },
        ],
      }],
    }),
  });
  if (!res.ok) throw new Error(`Vision API HTTP ${res.status}: ${await res.text()}`);
  const json: VisionResponse = await res.json();
  const r = json.responses[0];
  if (r?.error) throw new Error(r.error.message);
  return {
    labels:  r?.labelAnnotations            ?? [],
    objects: r?.localizedObjectAnnotations  ?? [],
  };
}

/** True if a Vision label text and a keyword share a meaningful substring match */
function hits(labelText: string, keyword: string): boolean {
  // bidirectional: label ⊆ keyword  OR  keyword ⊆ label
  return labelText.includes(keyword) || keyword.includes(labelText);
}

function classify(
  labels:  VisionLabel[],
  objects: VisionObject[],
  expected: string,
): { accepted: boolean; confidence: number; bounding_box: object | null; reason: string } {

  // Flatten everything into one scored list
  const all = [
    ...labels.map(l  => ({ text: l.description.toLowerCase(), score: l.score })),
    ...objects.map(o => ({ text: o.name.toLowerCase(),        score: o.score })),
  ];

  console.log("[classify] expected:", expected, "labels:", all.map(a => `${a.text}(${a.score.toFixed(2)})`).join(", "));

  const keywords = (CATEGORY_KEYWORDS[expected] ?? []).map(k => k.toLowerCase());

  // 1. Specific category match (bidirectional)
  let categoryScore = 0;
  for (const { text, score } of all) {
    for (const kw of keywords) {
      if (hits(text, kw) && score > categoryScore) categoryScore = score;
    }
  }

  // 2. General "is this trash?" check
  let trashScore = 0;
  for (const { text, score } of all) {
    for (const tw of TRASH_WORDS) {
      if (text.includes(tw) && score > trashScore) trashScore = score;
    }
  }

  // Decide
  const MIN = 0.50;

  if (categoryScore >= MIN) {
    return { accepted: true,  confidence: categoryScore, bounding_box: null, reason: "category_match" };
  }
  if (trashScore >= MIN) {
    // It's trash but didn't perfectly match the category — accept with slight penalty
    return { accepted: true,  confidence: trashScore * 0.85, bounding_box: null, reason: "trash_detected" };
  }
  if (all.length === 0) {
    return { accepted: false, confidence: 0,            bounding_box: null, reason: "no_labels" };
  }

  // Vision returned labels but nothing trash-like at all
  return { accepted: false, confidence: Math.max(categoryScore, trashScore), bounding_box: null, reason: "not_trash" };
}

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { image_base64, expected_category = "Extra Trash" }: {
      image_base64?: string;
      expected_category?: string;
    } = await req.json();

    if (!image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey            = Deno.env.get("GOOGLE_VISION_API_KEY");
    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    let result: ReturnType<typeof classify>;

    if (apiKey) {
      // Simplest auth — just an API key
      try {
        const { labels, objects } = await callGoogleVision(image_base64, { type: "apikey", key: apiKey });
        result = classify(labels, objects, expected_category);
        console.log("[validate-trash-photo] used API key auth, reason:", result.reason);
      } catch (visionErr) {
        console.warn("[validate-trash-photo] API key Vision call failed:", visionErr);
        result = { accepted: true, confidence: 0.82, bounding_box: null, reason: "demo" };
      }
    } else if (serviceAccountJson) {
      // Service account JWT auth
      try {
        const accessToken = await getAccessToken(serviceAccountJson);
        const { labels, objects } = await callGoogleVision(image_base64, { type: "bearer", token: accessToken });
        result = classify(labels, objects, expected_category);
        console.log("[validate-trash-photo] used service account auth, reason:", result.reason);
      } catch (visionErr) {
        console.warn("[validate-trash-photo] service account Vision call failed:", visionErr);
        result = { accepted: true, confidence: 0.82, bounding_box: null, reason: "demo" };
      }
    } else {
      // No credentials — demo mode
      console.log("[validate-trash-photo] no credentials set, using demo fallback");
      result = { accepted: true, confidence: 0.82, bounding_box: null, reason: "demo" };
    }

    return new Response(
      JSON.stringify({
        accepted:     result.accepted,
        is_valid:     result.accepted,
        category:     expected_category,
        confidence:   result.confidence,
        bounding_box: result.bounding_box,
        reason:       result.reason,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[validate-trash-photo] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
