import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getCaller, isAdmin } from "@/lib/verifyCaller";

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller || !(await isAdmin(caller.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { isOnline } = await req.json();

  const db = getSupabaseAdmin();
  const { error } = await db
    .from("human_presence")
    .update({ is_online: !!isOnline, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
