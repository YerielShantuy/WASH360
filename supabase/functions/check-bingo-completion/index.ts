import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

// BingoCard cells JSON shape stored in bingo_cards.cells
interface BingoCellState {
  id: string;
  category: string;
  label: string;
  status: "empty" | "pending" | "verified" | "rejected";
  submission_id: string | null;
}

// Returns all winning line indices for a 3×3 or 4×4 board
function getWinningLines(size: number): number[][] {
  const lines: number[][] = [];
  // Rows
  for (let r = 0; r < size; r++) {
    lines.push(Array.from({ length: size }, (_, c) => r * size + c));
  }
  // Columns
  for (let c = 0; c < size; c++) {
    lines.push(Array.from({ length: size }, (_, r) => r * size + c));
  }
  // Diagonals
  lines.push(Array.from({ length: size }, (_, i) => i * size + i));
  lines.push(Array.from({ length: size }, (_, i) => i * size + (size - 1 - i)));
  return lines;
}

function checkBingo(cells: BingoCellState[]): {
  has_bingo: boolean;
  winning_lines: number[][];
  verified_count: number;
} {
  const verified = cells.map((c) => c.status === "verified");
  const verified_count = verified.filter(Boolean).length;
  const size = Math.round(Math.sqrt(cells.length));
  const lines = getWinningLines(size);
  const winning_lines = lines.filter((line) => line.every((idx) => verified[idx]));
  return { has_bingo: winning_lines.length > 0, winning_lines, verified_count };
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const {
      card_id,
      user_id,
      submission_id,
      cell_index,
      item_count = 1,
    }: {
      card_id: string;
      user_id: string;
      submission_id: string;
      cell_index: number;
      item_count?: number;
    } = await req.json();

    // Fetch current card state
    const { data: card, error: cardError } = await supabase
      .from("bingo_cards")
      .select("cells, completed_at")
      .eq("id", card_id)
      .single();

    if (cardError) throw cardError;
    if (card.completed_at) {
      return new Response(
        JSON.stringify({ has_bingo: true, already_complete: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark the target cell as verified
    const cells = (card.cells as BingoCellState[]).map((c, idx) =>
      idx === cell_index
        ? { ...c, status: "verified" as const, submission_id }
        : c
    );

    const { has_bingo, winning_lines, verified_count } = checkBingo(cells);

    // Update cells in DB
    await supabase
      .from("bingo_cards")
      .update({
        cells,
        ...(has_bingo ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq("id", card_id);

    const BINGO_BONUS = 200;
    const CELL_POINTS_BASE = 20;
    // Multi-trash: each extra item in the same photo earns the same base points
    const cellPoints = CELL_POINTS_BASE * Math.max(1, item_count);

    // Award cell completion points (multiplied by detected item count)
    await supabase.rpc("award_points", {
      p_user_id: user_id,
      p_amount: cellPoints,
      p_source: "bingo",
      p_reference: submission_id,
    });

    // Award bingo bonus on first completion
    if (has_bingo) {
      await supabase.rpc("award_points", {
        p_user_id: user_id,
        p_amount: BINGO_BONUS,
        p_source: "bingo",
        p_reference: card_id,
      });
    }

    return new Response(
      JSON.stringify({
        has_bingo,
        winning_lines,
        verified_count,
        points_awarded: cellPoints + (has_bingo ? BINGO_BONUS : 0),
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
