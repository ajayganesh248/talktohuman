"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ensureSession } from "@/lib/ensureSession";
import { authFetch } from "@/lib/authFetch";

export default function WaitingPage() {
  const router = useRouter();
  const heartbeatRef = useRef(null);

  useEffect(() => {
    let channel;
    let cancelled = false;

    async function init() {
      const userId = await ensureSession();
      if (cancelled) return;

      const { data: waiting, error: fetchErr } = await supabase
        .from("waiting_users")
        .select("id, status, room_id")
        .eq("user_auth_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchErr || !waiting) {
        router.replace("/");
        return;
      }

      if (waiting.status === "accepted" && waiting.room_id) {
        router.replace(`/chat/${waiting.room_id}`);
        return;
      }

      channel = supabase
        .channel(`waiting-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "waiting_users",
            filter: `user_auth_id=eq.${userId}`,
          },
          (payload) => {
            if (payload.new.status === "accepted" && payload.new.room_id) {
              router.replace(`/chat/${payload.new.room_id}`);
            } else if (payload.new.status === "cancelled") {
              router.replace("/");
            }
          }
        )
        .subscribe();

      heartbeatRef.current = setInterval(() => {
        authFetch("/api/heartbeat", { method: "POST" }).catch(() => {});
      }, 5000);
    }

    init();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [router]);

  async function cancelWait() {
    await authFetch("/api/queue/join", { method: "DELETE" }).catch(() => {});
    router.replace("/");
  }

  return (
    <div className="page">
      <div className="card">
        <div className="spinner" />
        <h1>Waiting for Human</h1>
        <p className="subtitle">
          You're in the queue. As soon as the human accepts you, this page
          will automatically open your private chat. Please don't close this
          tab.
        </p>
        <button className="btn-secondary" onClick={cancelWait}>
          Cancel and go back
        </button>
      </div>
    </div>
  );
}
