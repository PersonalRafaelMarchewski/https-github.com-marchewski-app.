import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Usa a service_role key — ignora RLS. Nunca importar isto de um Client Component.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
