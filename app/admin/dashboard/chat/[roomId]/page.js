"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ChatRoom from "@/components/ChatRoom";

export default function AdminChatPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function validate() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/admin");
        return;
      }

      const { data, error } = await supabase
        .from("chat_rooms")
        .select("id, status")
        .eq("id", roomId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        router.replace("/admin/dashboard");
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
      senderType="admin"
      senderId="admin"
      headerLabel="Chatting with User"
      onEnded={() => router.replace("/admin/dashboard")}
    />
  );
}
