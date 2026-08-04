import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requiredEnv } from "@/lib/env";

// Usa a service_role key — ignora RLS. Nunca importar isto de um Client Component.
export function createAdminClient() {
  return createSupabaseClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
