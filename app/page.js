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

  // Offline message form state
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");

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

  async function sendOfflineMessage(e) {
    e.preventDefault();
    const text = message.trim();
    if (!text || sending) return;

    setSending(true);
    setSendError("");
    try {
      const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_KEY;
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: accessKey,
          subject: "New message on TalkToHuman",
          from_name: "TalkToHuman visitor",
          message: text,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error("Could not send message");
      setSent(true);
      setMessage("");
    } catch (err) {
      setSendError("Could not send. Please try again.");
    } finally {
      setSending(false);
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
            : "Human is offline right now"}
        </p>

        {error && <p className="error-text">{error}</p>}

        {isOnline ? (
          <button className="btn-primary" onClick={startChat} disabled={loading}>
            {loading ? "Starting..." : "Start Chat"}
          </button>
        ) : sent ? (
          <p style={{ color: "#3ddc84" }}>
            Message sent! You'll get a reply once the human is back online.
          </p>
        ) : (
          <form onSubmit={sendOfflineMessage}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Leave a message and I'll get back to you..."
              rows={4}
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #262b36",
                background: "#0f1115",
                color: "#eaeaea",
                fontSize: 15,
                marginBottom: 12,
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
            {sendError && <p className="error-text">{sendError}</p>}
            <button className="btn-primary" type="submit" disabled={sending}>
              {sending ? "Sending..." : "Send Message"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
