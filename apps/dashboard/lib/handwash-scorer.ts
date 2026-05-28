export type Landmark = { x: number; y: number; z: number };

const STEP_DURATION_MS = 2000;
const DECAY_RATE = 0.5; // progress decay multiplier when gesture not held

// MediaPipe hand landmark connections for skeleton drawing
export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],         // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],         // index
  [5, 9], [9, 10], [10, 11], [11, 12],   // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20], // pinky + palm
];

function dist2D(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function centroid(lm: Landmark[], indices: number[]): Landmark {
  const pts = indices.map((i) => lm[i]);
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    z: pts.reduce((s, p) => s + p.z, 0) / pts.length,
  };
}

// WHO step gesture detectors
// Returns true when the target gesture is being actively performed.
// Coordinates are normalized 0–1 (MediaPipe output space).

function step0_PalmToPalm(h0: Landmark[], h1: Landmark[]): boolean {
  const palmA = centroid(h0, [0, 5, 9, 13, 17]);
  const palmB = centroid(h1, [0, 5, 9, 13, 17]);
  return dist2D(palmA, palmB) < 0.18;
}

function step1_FingersInterlaced(h0: Landmark[], h1: Landmark[]): boolean {
  const tipsA = [8, 12, 16, 20].map((i) => ({ x: h0[i].x, src: "A" as const }));
  const tipsB = [8, 12, 16, 20].map((i) => ({ x: h1[i].x, src: "B" as const }));
  const all = [...tipsA, ...tipsB].sort((a, b) => a.x - b.x);
  let alternations = 0;
  for (let i = 1; i < all.length; i++) {
    if (all[i].src !== all[i - 1].src) alternations++;
  }
  return alternations >= 4;
}

function step2_PalmOverBack(h0: Landmark[], h1: Landmark[]): boolean {
  // One palm overlays the dorsal (back) of the other: palms close, one higher
  const palmA = centroid(h0, [0, 5, 9, 13, 17]);
  const palmB = centroid(h1, [0, 5, 9, 13, 17]);
  return dist2D(palmA, palmB) < 0.16;
}

function step3_BacksOfFingers(h0: Landmark[], h1: Landmark[]): boolean {
  // MCP knuckles of both hands face each other (close proximity)
  const mcpA = centroid(h0, [5, 9, 13, 17]);
  const mcpB = centroid(h1, [5, 9, 13, 17]);
  return dist2D(mcpA, mcpB) < 0.15;
}

function step4_RotationalThumb(h0: Landmark[], h1: Landmark[]): boolean {
  // Thumb tips close — clasped and rotating
  return dist2D(h0[4], h1[4]) < 0.13;
}

function step5_FingertipsOnPalm(h0: Landmark[], h1: Landmark[]): boolean {
  // Fingertips of one hand near palm center of the other
  const tips0 = centroid(h0, [8, 12, 16, 20]);
  const tips1 = centroid(h1, [8, 12, 16, 20]);
  const palmCenter0 = h0[9]; // middle MCP as palm center proxy
  const palmCenter1 = h1[9];
  return dist2D(tips0, palmCenter1) < 0.15 || dist2D(tips1, palmCenter0) < 0.15;
}

function step6_Wrists(h0: Landmark[], h1: Landmark[]): boolean {
  // Wrists of both hands near each other (clasping motion)
  return dist2D(h0[0], h1[0]) < 0.16;
}

const DETECTORS = [
  step0_PalmToPalm,
  step1_FingersInterlaced,
  step2_PalmOverBack,
  step3_BacksOfFingers,
  step4_RotationalThumb,
  step5_FingertipsOnPalm,
  step6_Wrists,
];

export function createHandwashScorer() {
  const consecutiveMs = new Array(7).fill(0) as number[];
  const scored = new Array(7).fill(false) as boolean[];

  function processStep(
    stepIdx: number,
    allHands: Landmark[][],
    deltaMs: number
  ): { progress: number; scored: boolean } {
    if (scored[stepIdx]) return { progress: 1, scored: true };

    const h0 = allHands[0] ?? null;
    const h1 = allHands.length > 1 ? allHands[1] : null;

    if (!h0 || !h1) {
      // Decay progress when hands aren't visible
      consecutiveMs[stepIdx] = Math.max(0, consecutiveMs[stepIdx] - deltaMs * DECAY_RATE);
      return { progress: consecutiveMs[stepIdx] / STEP_DURATION_MS, scored: false };
    }

    const detected = DETECTORS[stepIdx](h0, h1);

    if (detected) {
      consecutiveMs[stepIdx] = Math.min(consecutiveMs[stepIdx] + deltaMs, STEP_DURATION_MS);
    } else {
      consecutiveMs[stepIdx] = Math.max(0, consecutiveMs[stepIdx] - deltaMs * DECAY_RATE);
    }

    if (consecutiveMs[stepIdx] >= STEP_DURATION_MS) {
      scored[stepIdx] = true;
      return { progress: 1, scored: true };
    }

    return { progress: consecutiveMs[stepIdx] / STEP_DURATION_MS, scored: false };
  }

  function getScore(): number {
    const count = scored.filter(Boolean).length;
    return count * 14 + (count === 7 ? 2 : 0);
  }

  function getScoredSteps(): boolean[] {
    return [...scored];
  }

  return { processStep, getScore, getScoredSteps };
}
