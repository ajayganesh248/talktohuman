"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { authFetch } from "@/lib/authFetch";

/**
 * senderType: "user" | "admin"  — whose bubble should be styled as "mine"
 * senderId:   anonId for a user, "admin" for the admin
 * headerLabel: text shown top-left of the chat header
 * onEnded:    called after the room is successfully ended
 */
export default function ChatRoom({
  roomId,
  senderType,
  senderId,
  headerLabel,
  onEnded,
}) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [roomStatus, setRoomStatus] = useState("active");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    let channel;

    async function loadHistory() {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_type, sender_id, content, created_at")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });
      setMessages(data || []);
    }

    async function loadRoomStatus() {
      const { data } = await supabase
        .from("chat_rooms")
        .select("status")
        .eq("id", roomId)
        .single();
      if (data) setRoomStatus(data.status);
    }

    loadHistory();
    loadRoomStatus();

    channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          // Skip messages we already added optimistically (own sends) —
          // avoids the same message flashing in twice.
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          setRoomStatus(payload.new.status);
          if (payload.new.status === "ended" && onEnded) onEnded();
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;

    setSending(true);
    setText("");

    // Show the message immediately (optimistic UI) instead of waiting
    // for the server round-trip + realtime echo — feels instant.
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      sender_type: senderType,
      sender_id: senderId,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await authFetch("/api/chat/send", {
        method: "POST",
        body: JSON.stringify({ roomId, content }),
      });
      const data = await res.json();

      if (res.ok && data.id) {
        // Swap the temp message for the real one so the realtime
        // INSERT event (which arrives with the same id) gets deduped.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, id: data.id, created_at: data.created_at } : m
          )
        );
      } else {
        // Failed to send — remove the optimistic bubble.
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  }

  async function endChat() {
    await authFetch("/api/chat/end", {
      method: "POST",
      body: JSON.stringify({ roomId }),
    }).catch(() => {});
    if (onEnded) onEnded();
  }

  return (
    <div className="chat-wrap">
      <div className="chat-header">
        <strong>{headerLabel}</strong>
        <button className="btn-danger" onClick={endChat}>
          End Chat
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`msg ${
              m.sender_type === senderType ? "msg-mine" : "msg-theirs"
            }`}
          >
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {roomStatus === "ended" ? (
        <div style={{ padding: 20, textAlign: "center", color: "#9aa1ac" }}>
          This chat has ended.
        </div>
      ) : (
        <form className="chat-input-bar" onSubmit={sendMessage}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            autoFocus
          />
          <button className="btn-primary" type="submit" disabled={sending}>
            Send
          </button>
        </form>
      )}
    </div>
  );
}
