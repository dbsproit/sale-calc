import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

// Uso em Server Components, Server Actions e Route Handlers.
// Em Server Components puros o `setAll` pode falhar silenciosamente (não é permitido
// escrever cookies fora de Server Actions/Route Handlers) - o proxy.ts cuida do refresh.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // chamado de um Server Component - ignorado, o proxy.ts faz o refresh de sessão.
          }
        },
      },
    }
  );
}
