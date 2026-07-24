import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * There is no separate backend in this deployment — the browser writes
 * directly to Supabase using the public anon key. Row Level Security
 * restricts this key to INSERT/UPDATE only (no SELECT, no DELETE) on
 * `writers`, `samples`, and the `handwriting` storage bucket — see
 * supabase/migrations/0003_anon_write_policies.sql.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
