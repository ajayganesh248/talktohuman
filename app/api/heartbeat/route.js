import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getCaller } from "@/lib/verifyCaller";

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  await db
    .from("waiting_users")
    .update({ updated_at: new Date().toISOString() })
    .eq("user_auth_id", caller.id)
    .eq("status", "waiting");

  return NextResponse.json({ ok: true });
}
