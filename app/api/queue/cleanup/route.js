import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getCaller, isAdmin } from "@/lib/verifyCaller";

// Removes waiting_users rows that have gone stale (no heartbeat within
// WAITING_TIMEOUT_MINUTES), e.g. someone who closed the tab while waiting.
// Call this from a scheduled job (Vercel Cron) using the CRON_SECRET
// header, or trigger it manually while logged in as admin.
export async function POST(req) {
  const cronSecret = req.headers.get("x-cron-secret");
  const authorizedByCron =
    cronSecret && cronSecret === process.env.CRON_SECRET;

  if (!authorizedByCron) {
    const caller = await getCaller(req);
    if (!caller || !(await isAdmin(caller.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const timeoutMinutes = Number(process.env.WAITING_TIMEOUT_MINUTES || 3);
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("waiting_users")
    .update({ status: "cancelled" })
    .eq("status", "waiting")
    .lt("updated_at", cutoff)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ removed: data ? data.length : 0 });
}
