import { createClient } from "@/lib/supabase";

export interface RelayState {
  pump: boolean;
  uv_light: boolean;
}

export async function setRelay(moduleId: string, state: Partial<RelayState>): Promise<void> {
  const supabase = createClient();
  const db = supabase as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  await db.from("module_relay").upsert({
    module_id: moduleId,
    pump: state.pump ?? false,
    uv_light: state.uv_light ?? false,
    updated_at: new Date().toISOString(),
  }, { onConflict: "module_id" });
}

export async function pulsePump(moduleId: string, durationMs = 3000): Promise<void> {
  await setRelay(moduleId, { pump: true, uv_light: false });
  await new Promise((r) => setTimeout(r, durationMs));
  await setRelay(moduleId, { pump: false, uv_light: false });
}
