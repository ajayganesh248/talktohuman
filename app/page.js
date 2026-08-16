"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ensureSession } from "@/lib/ensureSession";
import { authFetch } from "@/lib/authFetch";

export default function HomePage() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let channel;

    async function loadPresence() {
      const { data } = await supabase
        .from("human_presence")
        .select("is_online")
        .eq("id", 1)
        .single();
      setIsOnline(data ? data.is_online : false);
    }

    loadPresence();

    channel = supabase
      .channel("presence-watch")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "human_presence" },
        (payload) => setIsOnline(payload.new.is_online)
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  async function startChat() {
    setLoading(true);
    setError("");
    try {
      await ensureSession();
      const res = await authFetch("/api/queue/join", { method: "POST" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Could not start chat");

      if (data.roomId) {
        router.push(`/chat/${data.roomId}`);
      } else {
        router.push("/waiting");
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h1>TalkToHuman</h1>
        <p className="subtitle">
          No AI. No chatbot. No strangers. Just you, talking directly to a
          real person on the other side.
        </p>

        <p style={{ marginBottom: 24 }}>
          <span
            className={`status-dot ${
              isOnline ? "status-online" : "status-offline"
            }`}
          />
          {isOnline === null
            ? "Checking status..."
            : isOnline
            ? "Human is online"
            : "Human is offline — you can still wait"}
        </p>

        {error && <p className="error-text">{error}</p>}

        <button className="btn-primary" onClick={startChat} disabled={loading}>
          {loading ? "Starting..." : "Start Chat"}
        </button>
      </div>
    </div>
  );
}
