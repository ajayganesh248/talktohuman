"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { authFetch } from "@/lib/authFetch";

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [queue, setQueue] = useState([]);
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/admin");
        return;
      }

      const res = await authFetch("/api/queue/list");
      if (res.status === 403) {
        router.replace("/admin");
        return;
      }
      const body = await res.json();
      if (cancelled) return;

      setQueue(body.queue || []);
      setIsOnline(body.isOnline || false);
      setChecking(false);

      pollRef.current = setInterval(refresh, 3000);
    }

    init();
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    try {
      const res = await authFetch("/api/queue/list");
      if (!res.ok) return;
      const body = await res.json();
      setQueue(body.queue || []);
      setIsOnline(body.isOnline || false);
    } catch {
      // ignore transient poll errors
    }
  }

  async function togglePresence() {
    setError("");
    const next = !isOnline;
    setIsOnline(next);
    const res = await authFetch("/api/admin/presence", {
      method: "POST",
      body: JSON.stringify({ isOnline: next }),
    });
    if (!res.ok) {
      setIsOnline(!next);
      setError("Could not update status");
    }
  }

  async function accept(waitingId) {
    setError("");
    const res = await authFetch("/api/queue/accept", {
      method: "POST",
      body: JSON.stringify({ waitingId }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || "Could not accept user");
      return;
    }
    router.push(`/admin/dashboard/chat/${body.roomId}`);
  }

  async function logout() {
    // Go offline first so waiting/home visitors immediately see the
    // correct status, then end the admin session.
    await authFetch("/api/admin/presence", {
      method: "POST",
      body: JSON.stringify({ isOnline: false }),
    }).catch(() => {});
    await supabase.auth.signOut();
    router.replace("/admin");
  }

  if (checking) {
    return (
      <div className="page">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="admin-wrap">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ margin: 0 }}>Human Dashboard</h1>
        <button className="btn-secondary" onClick={logout}>
          Log Out
        </button>
      </div>

      <div className="card" style={{ maxWidth: "none", marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            <span
              className={`status-dot ${
                isOnline ? "status-online" : "status-offline"
              }`}
            />
            You are {isOnline ? "Online" : "Offline"}
          </span>
          <button
            className={isOnline ? "btn-secondary" : "btn-primary"}
            onClick={togglePresence}
          >
            Go {isOnline ? "Offline" : "Online"}
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <h2 style={{ fontSize: 18, marginBottom: 12 }}>
        Waiting Users ({queue.length})
      </h2>

      {queue.length === 0 ? (
        <div className="queue-empty">No one is waiting right now.</div>
      ) : (
        queue.map((w) => (
          <div className="queue-item" key={w.id}>
            <span>Waiting for {timeAgo(w.created_at)}</span>
            <button className="btn-primary" onClick={() => accept(w.id)}>
              Accept
            </button>
          </div>
        ))
      )}
    </div>
  );
}
