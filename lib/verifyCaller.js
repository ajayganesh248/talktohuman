import { getSupabaseAdmin } from "./supabaseAdmin";

// Reads the "Authorization: Bearer <token>" header, verifies it against
// Supabase, and returns the caller's user object (works for both
// anonymous visitors and the real admin account). Returns null if the
// token is missing or invalid.
export async function getCaller(req) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

// Checks the `admins` table to see if this user id is the Human/Admin.
export async function isAdmin(userId) {
  if (!userId) return false;
  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}
