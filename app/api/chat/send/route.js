import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getCaller, isAdmin } from "@/lib/verifyCaller";

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { roomId, content } = await req.json();
  const trimmed = (content || "").trim();
  if (!roomId || !trimmed) {
    return NextResponse.json({ error: "roomId and content required" }, { status: 400 });
  }
  if (trimmed.length > 2000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Run independent checks together instead of one after another —
  // cuts a full network round-trip off every message send.
  const [callerIsAdmin, roomResult] = await Promise.all([
    isAdmin(caller.id),
    db.from("chat_rooms").select("id, status, user_auth_id").eq("id", roomId).single(),
  ]);

  const { data: room, error: roomErr } = roomResult;

  if (roomErr || !room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (room.status !== "active") {
    return NextResponse.json({ error: "This chat has ended" }, { status: 409 });
  }

  const isOwner = room.user_auth_id === caller.id;
  if (!callerIsAdmin && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const senderType = callerIsAdmin ? "admin" : "user";

  const { data: inserted, error: insertErr } = await db
    .from("messages")
    .insert({
      room_id: roomId,
      sender_type: senderType,
      sender_id: caller.id,
      content: trimmed,
    })
    .select("id, created_at")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: inserted.id, created_at: inserted.created_at });
}
