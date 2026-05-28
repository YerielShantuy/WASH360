import { createClient } from "@/lib/supabase";

export interface RelayState {
  pump?: boolean;
  uv?: boolean;
}

export async function setRelay(state: RelayState): Promise<void> {
  const supabase = createClient();
  const update: Record<string, boolean> = {};
  if (state.pump !== undefined) update.pump = state.pump;
  if (state.uv !== undefined) update.uv = state.uv;
  if (Object.keys(update).length === 0) return;
  await (supabase as any).from("relay_state").update(update).eq("id", 1); // eslint-disable-line @typescript-eslint/no-explicit-any
}

export async function pulsePump(durationMs = 3000): Promise<void> {
  await setRelay({ pump: true });
  await new Promise((r) => setTimeout(r, durationMs));
  await setRelay({ pump: false });
}
