import { createBrowserClient } from "@supabase/ssr";

export function createClient() {

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // This will now only trigger if the variables are truly missing
    console.error("Supabase environment variables are missing!");
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
