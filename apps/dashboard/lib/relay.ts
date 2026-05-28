import { createClient } from "@/lib/supabase";

export interface RelayState {
  pump?: boolean;
  uv?: boolean;
}

export async function setRelay(state: RelayState): Promise<void> {
  const update: Record<string, boolean> = {};
  if (state.pump !== undefined) update.pump = state.pump;
  if (state.uv !== undefined) update.uv = state.uv;
  if (Object.keys(update).length === 0) return;

  const supabase = createClient();
  const { error } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .from("relay_state")
    .update(update)
    .eq("id", 1);

  if (error) console.error("[relay] setRelay failed:", error.message, update);
}

export async function pulsePump(durationMs = 3000): Promise<void> {
  await setRelay({ pump: true });
  await new Promise((r) => setTimeout(r, durationMs));
  await setRelay({ pump: false });
}
