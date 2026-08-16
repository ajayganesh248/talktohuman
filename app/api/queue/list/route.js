import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getCaller, isAdmin } from "@/lib/verifyCaller";

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller || !(await isAdmin(caller.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getSupabaseAdmin();

  const [{ data: queue }, { data: presence }] = await Promise.all([
    db
      .from("waiting_users")
      .select("id, created_at")
      .eq("status", "waiting")
      .order("created_at", { ascending: true }),
    db.from("human_presence").select("is_online").eq("id", 1).single(),
  ]);

  return NextResponse.json({
    queue: queue || [],
    isOnline: presence ? presence.is_online : false,
  });
}
