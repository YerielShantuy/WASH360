export type Landmark = { x: number; y: number; z: number };

// Each WHO step must be held for this long to be awarded
const STEP_DURATION_MS = 2000;
// How fast progress decays when gesture not detected
const DECAY_RATE = 0.4;

export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

function dist2D(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// 3D distance — more robust for back-camera depth variation
function dist3D(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function centroid(lm: Landmark[], indices: number[]): Landmark {
  const pts = indices.map((i) => lm[i]);
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    z: pts.reduce((s, p) => s + p.z, 0) / pts.length,
  };
}

// Relaxed thresholds — back camera + any hand orientation (including vertical/prayer)
// Using 3D distance where depth matters

function step0_PalmToPalm(h0: Landmark[], h1: Landmark[]): boolean {
  const palmA = centroid(h0, [0, 5, 9, 13, 17]);
  const palmB = centroid(h1, [0, 5, 9, 13, 17]);
  // Palms close in any orientation
  return dist3D(palmA, palmB) < 0.28;
}

function step1_FingersInterlaced(h0: Landmark[], h1: Landmark[]): boolean {
  // Check interleaving along both X and Y axes (handles vertical orientation)
  const tipsA = [8, 12, 16, 20].map((i) => h0[i]);
  const tipsB = [8, 12, 16, 20].map((i) => h1[i]);

  // X-axis interleaving (horizontal hands)
  const byX = [...tipsA.map((t) => ({ v: t.x, s: "A" })), ...tipsB.map((t) => ({ v: t.x, s: "B" }))].sort((a, b) => a.v - b.v);
  let xAlt = 0;
  for (let i = 1; i < byX.length; i++) if (byX[i].s !== byX[i - 1].s) xAlt++;

  // Y-axis interleaving (vertical hands)
  const byY = [...tipsA.map((t) => ({ v: t.y, s: "A" })), ...tipsB.map((t) => ({ v: t.y, s: "B" }))].sort((a, b) => a.v - b.v);
  let yAlt = 0;
  for (let i = 1; i < byY.length; i++) if (byY[i].s !== byY[i - 1].s) yAlt++;

  // Hands also need to be close
  const palmA = centroid(h0, [0, 5, 9, 13, 17]);
  const palmB = centroid(h1, [0, 5, 9, 13, 17]);
  const close = dist3D(palmA, palmB) < 0.30;

  return close && (xAlt >= 4 || yAlt >= 4);
}

function step2_PalmOverBack(h0: Landmark[], h1: Landmark[]): boolean {
  const palmA = centroid(h0, [0, 5, 9, 13, 17]);
  const palmB = centroid(h1, [0, 5, 9, 13, 17]);
  // One palm overlays the back of the other — palms close but z differs
  const xyClose = dist2D(palmA, palmB) < 0.22;
  const zDiff = Math.abs(palmA.z - palmB.z) > 0.02;
  return xyClose && zDiff;
}

function step3_BacksOfFingers(h0: Landmark[], h1: Landmark[]): boolean {
  // MCP knuckles facing each other — close proximity
  const mcpA = centroid(h0, [5, 9, 13, 17]);
  const mcpB = centroid(h1, [5, 9, 13, 17]);
  return dist3D(mcpA, mcpB) < 0.22;
}

function step4_RotationalThumb(h0: Landmark[], h1: Landmark[]): boolean {
  // Thumb tips and bases close (clasped)
  const thumbClose = dist3D(h0[4], h1[4]) < 0.20;
  const baseClose = dist3D(h0[2], h1[2]) < 0.25;
  return thumbClose || baseClose;
}

function step5_FingertipsOnPalm(h0: Landmark[], h1: Landmark[]): boolean {
  const tips0 = centroid(h0, [8, 12, 16, 20]);
  const tips1 = centroid(h1, [8, 12, 16, 20]);
  const palm0 = h0[9];
  const palm1 = h1[9];
  return dist3D(tips0, palm1) < 0.20 || dist3D(tips1, palm0) < 0.20;
}

function step6_Wrists(h0: Landmark[], h1: Landmark[]): boolean {
  // Wrists close to each other — clasping motion
  return dist3D(h0[0], h1[0]) < 0.22;
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

export interface ScorerState {
  stepProgress: number[];        // 0–1 per step
  scored: boolean[];             // whether each step has been awarded
  latheringMs: number;           // total time both hands detected (ms)
  handsVisible: boolean;
}

export function createHandwashScorer() {
  const consecutiveMs = new Array(7).fill(0) as number[];
  const scored = new Array(7).fill(false) as boolean[];
  let latheringMs = 0;

  // Processes ALL 7 steps simultaneously — call once per frame
  function processFrame(
    allHands: Landmark[][],
    deltaMs: number
  ): ScorerState {
    const h0 = allHands[0] ?? null;
    const h1 = allHands.length > 1 ? allHands[1] : null;
    const handsVisible = !!(h0 && h1);

    if (handsVisible) latheringMs += deltaMs;

    for (let i = 0; i < 7; i++) {
      if (scored[i]) { consecutiveMs[i] = STEP_DURATION_MS; continue; }

      if (!handsVisible) {
        consecutiveMs[i] = Math.max(0, consecutiveMs[i] - deltaMs * DECAY_RATE);
        continue;
      }

      const detected = DETECTORS[i](h0!, h1!);
      if (detected) {
        consecutiveMs[i] = Math.min(consecutiveMs[i] + deltaMs, STEP_DURATION_MS);
      } else {
        consecutiveMs[i] = Math.max(0, consecutiveMs[i] - deltaMs * DECAY_RATE);
      }

      if (consecutiveMs[i] >= STEP_DURATION_MS) {
        scored[i] = true;
      }
    }

    return {
      stepProgress: consecutiveMs.map((ms) => ms / STEP_DURATION_MS),
      scored: [...scored],
      latheringMs,
      handsVisible,
    };
  }

  function getScore(minLatheringMs = 20_000): number {
    const count = scored.filter(Boolean).length;
    const stepPts = count * 14 + (count === 7 ? 2 : 0);
    // Lathering bonus: up to +10 pts for ≥20 s continuous lathering
    const latherBonus = latheringMs >= minLatheringMs ? 10 : Math.floor((latheringMs / minLatheringMs) * 10);
    return Math.min(100, stepPts + latherBonus);
  }

  function getScoredSteps(): boolean[] { return [...scored]; }
  function getLatheringMs(): number { return latheringMs; }

  return { processFrame, getScore, getScoredSteps, getLatheringMs };
}
