import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getCaller, isAdmin } from "@/lib/verifyCaller";

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { roomId } = await req.json();
  if (!roomId) {
    return NextResponse.json({ error: "roomId required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const callerIsAdmin = await isAdmin(caller.id);

  const { data: room, error: roomErr } = await db
    .from("chat_rooms")
    .select("id, user_auth_id, status")
    .eq("id", roomId)
    .single();

  if (roomErr || !room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const isOwner = room.user_auth_id === caller.id;
  if (!callerIsAdmin && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (room.status === "ended") {
    return NextResponse.json({ ok: true });
  }

  const { error: updateErr } = await db
    .from("chat_rooms")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", roomId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
