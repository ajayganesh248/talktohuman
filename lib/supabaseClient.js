"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Single shared browser client. Uses the public anon key only.
// All writes (join queue, accept, end chat, send message) go through
// our own API routes (server side, service role key) — the browser
// only ever reads via Supabase Realtime subscriptions.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});
