import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Cliente com a service_role key - ignora RLS totalmente. Só pode ser usado em
// código server-only (Server Actions/Route Handlers) já protegido por
// requireAdmin(), nunca importado de um Client Component.
export function createAdminClient() {
  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
