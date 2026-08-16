"use client";

import { supabase } from "./supabaseClient";

// Makes sure the browser has a Supabase session. Regular visitors get
// signed in anonymously (no email/password needed). The admin signs in
// separately with a real email+password on the /admin page, and that
// session is reused here automatically since Supabase persists it.
export async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;

  const { data: signInData, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return signInData.user.id;
}
