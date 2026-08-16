import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getCaller, isAdmin } from "@/lib/verifyCaller";

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller || !(await isAdmin(caller.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { waitingId } = await req.json();
  if (!waitingId) {
    return NextResponse.json({ error: "waitingId required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  const { data: waiting, error: fetchErr } = await db
    .from("waiting_users")
    .select("id, user_auth_id, status")
    .eq("id", waitingId)
    .single();

  if (fetchErr || !waiting) {
    return NextResponse.json({ error: "Waiting user not found" }, { status: 404 });
  }
  if (waiting.status !== "waiting") {
    return NextResponse.json(
      { error: "This user is no longer waiting" },
      { status: 409 }
    );
  }

  const { data: room, error: roomErr } = await db
    .from("chat_rooms")
    .insert({ user_auth_id: waiting.user_auth_id, status: "active" })
    .select("id")
    .single();

  if (roomErr) {
    return NextResponse.json({ error: roomErr.message }, { status: 500 });
  }

  const { error: updateErr } = await db
    .from("waiting_users")
    .update({ status: "accepted", room_id: room.id })
    .eq("id", waitingId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ roomId: room.id });
}
