"use client";

import { supabase } from "./supabaseClient";

export async function authFetch(url, options = {}) {
  const { data } = await supabase.auth.getSession();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (data.session) {
    headers["Authorization"] = `Bearer ${data.session.access_token}`;
  }
  return fetch(url, { ...options, headers });
}
