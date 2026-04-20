import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getRequiredEnvVar(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function createClient() {
  const cookieStore = cookies();
  const supabaseUrl = getRequiredEnvVar("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = getRequiredEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
          // Server Components cannot set cookies directly in some contexts.
        }
      },
    },
  });
}
