import { createClient as _createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Browser / React Native client (uses anon key)
export function createClient(supabaseUrl: string, supabaseAnonKey: string) {
  return _createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  });
}

// Server client (uses service role key — Next.js server components / Edge Functions only)
export function createServerClient(
  supabaseUrl: string,
  supabaseServiceRoleKey: string
) {
  return _createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
