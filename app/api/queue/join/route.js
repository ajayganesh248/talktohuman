import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getCaller, isAdmin } from "@/lib/verifyCaller";

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (await isAdmin(caller.id)) {
    return NextResponse.json(
      { error: "Admin cannot join the queue" },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin();

  // If this visitor already has an active waiting/accepted entry, reuse it
  // instead of creating a duplicate (handles page refresh on the home page).
  const { data: existing } = await db
    .from("waiting_users")
    .select("id, status, room_id")
    .eq("user_auth_id", caller.id)
    .in("status", ["waiting", "accepted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    if (existing.status === "accepted" && existing.room_id) {
      return NextResponse.json({ roomId: existing.room_id });
    }
    return NextResponse.json({ waitingId: existing.id });
  }

  const { data: created, error } = await db
    .from("waiting_users")
    .insert({ user_auth_id: caller.id, status: "waiting" })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ waitingId: created.id });
}

export async function DELETE(req) {
  const caller = await getCaller(req);
  if (!caller) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  await db
    .from("waiting_users")
    .update({ status: "cancelled" })
    .eq("user_auth_id", caller.id)
    .eq("status", "waiting");

  return NextResponse.json({ ok: true });
}
