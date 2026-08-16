"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ensureSession } from "@/lib/ensureSession";
import ChatRoom from "@/components/ChatRoom";

export default function UserChatPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId;
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function validate() {
      const id = await ensureSession();
      if (cancelled) return;
      setUserId(id);

      // RLS only returns this row if the room belongs to this user
      // (or the caller is the admin), so a null result here means
      // "not found or not yours" — either way, back to home.
      const { data, error } = await supabase
        .from("chat_rooms")
        .select("id, status")
        .eq("id", roomId)
        .maybeSingle();

      if (error || !data || data.status !== "active") {
        router.replace("/");
        return;
      }

      setReady(true);
    }

    validate();
    return () => {
      cancelled = true;
    };
  }, [roomId, router]);

  if (!ready) {
    return (
      <div className="page">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <ChatRoom
      roomId={roomId}
      senderType="user"
      senderId={userId}
      headerLabel="Talking to Human"
      onEnded={() => router.replace("/")}
    />
  );
}
