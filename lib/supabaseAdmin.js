import { createClient } from "@supabase/supabase-js";

// This client uses the SERVICE ROLE key and must NEVER be imported
// into any client component. It bypasses Row Level Security, which is
// exactly what we want: all writes happen through our trusted API
// routes, not directly from the browser.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
