// Server-side Supabase clients.
//
// Two distinct clients are exported:
//
//  1. getSupabaseServiceClient()  → uses the SERVICE_ROLE key, bypasses RLS.
//     Used by webhook handlers, report/plan generation, and anywhere we need
//     to write rows that anonymous/authenticated users wouldn't be able to.
//     NEVER expose this to a client component.
//
//  2. getSupabaseServerClient()   → uses the ANON key + cookies from the
//     incoming request, so the session established via @supabase/ssr in the
//     browser is visible to Server Components and Route Handlers. Use this
//     whenever you need to know "who is the currently logged-in user".
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

let serviceClient: SupabaseClient | null = null;

export function getSupabaseServiceClient(): SupabaseClient {
  if (serviceClient) return serviceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.",
    );
  }

  serviceClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serviceClient;
}

export async function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — set cookies via a Route Handler
          // / Middleware instead. Safe to ignore here since session refresh
          // happens elsewhere.
        }
      },
    },
  });
}
