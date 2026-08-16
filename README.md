# TalkToHuman

A website where a visitor can talk directly to one real human (you) —
never to another visitor, never to a bot.

- **Website**, not a mobile app. Runs in any browser (desktop or mobile).
- Built with **Next.js** (frontend + backend API routes together).
- **Supabase** stores data and pushes messages in realtime.
- Deployed on **Vercel** (free tier is enough to start).

---

## 1. Create your Supabase project

1. Go to https://supabase.com → Sign up / Log in → **New project**.
2. Wait ~2 minutes for it to finish setting up.
3. Go to **Project Settings → API**. Copy these three values, you'll need them soon:
   - `Project URL`
   - `anon public` key
   - `service_role` key (click "Reveal" — keep this one secret)

## 2. Run the database schema

1. In Supabase, open **SQL Editor → New query**.
2. Open `supabase/schema.sql` from this project, paste the whole file in, click **Run**.
3. This creates all tables, security rules, and turns on realtime.

## 3. Create your admin (Human) login

1. Supabase Dashboard → **Authentication → Users → Add user**.
2. Enter your own email + a strong password. Turn **Auto Confirm User** ON. Create.
3. Click the new user, copy their **User UID**.
4. Back in **SQL Editor**, run (replace with your real UID):
   ```sql
   insert into public.admins (user_id) values ('paste-your-uid-here');
   ```
5. This email + password is what you'll use to log in at `/admin`.

## 4. Configure environment variables

1. Copy `.env.local.example` to a new file named `.env.local`.
2. Fill in the Supabase URL, anon key, and service role key from Step 1.
3. Set `ADMIN_SESSION_SECRET` to any long random string (not used for login
   anymore, but keep it set — some routes reference it as a fallback).
4. `WAITING_TIMEOUT_MINUTES` controls how long a silent tab stays in queue
   before being auto-removed (default 3 minutes).

## 5. Run it locally (optional, to test before going live)

```bash
npm install
npm run dev
```

Open http://localhost:3000 — that's the visitor homepage.
Open http://localhost:3000/admin — that's your login.

Test flow: open the homepage in one browser tab (Start Chat), open
`/admin` in another tab or browser, log in, go Online, Accept the
waiting user, chat in realtime, End Chat.

## 6. Deploy live on Vercel

1. Push this project to a GitHub repository (create one on github.com,
   then `git init`, `git add .`, `git commit -m "TalkToHuman"`,
   `git remote add origin <your-repo-url>`, `git push -u origin main`).
2. Go to https://vercel.com → Sign up with GitHub → **Add New Project** →
   import your repository.
3. In the import screen, expand **Environment Variables** and add the
   same variables from your `.env.local` file (URL, anon key, service
   role key, admin session secret, waiting timeout).
4. Click **Deploy**. In ~2 minutes you'll get a live link like
   `https://talktohuman.vercel.app` — that's your live website.
5. Share that link. Log in at `/admin` on the same domain to run your
   dashboard from your phone or laptop.

### Optional: custom domain
Vercel → your project → **Settings → Domains** → add your own domain
(e.g. `talktohuman.com`) and follow the DNS steps shown.

### Optional: automatic queue cleanup
Right now stale queue entries are cleaned up passively. To fully
automate it, add a Vercel Cron Job that calls
`POST /api/queue/cleanup` every few minutes with header
`x-cron-secret: <your CRON_SECRET>` — add `CRON_SECRET` as an env
variable and set up the cron in `vercel.json` if you want this later.

---

## How it works (matches your original spec)

- Visitor opens the site → gets signed in anonymously (no signup) →
  clicks **Start Chat** → enters the waiting queue.
- You (admin) log in at `/admin`, go **Online**, see the live queue,
  click **Accept** on whichever visitor you want to talk to.
- Only that visitor and you enter a **private room** — realtime chat
  via Supabase, messages appear instantly with no refresh.
- Either side can click **End Chat**. Ended rooms can't be re-entered.
- If a visitor refreshes mid-chat, the app checks the room status:
  still active → back into the chat; ended/missing → back to home.
- Visitors can never see, join, or message another visitor's room —
  enforced at the database level (Row Level Security), not just in
  the app's UI.

## Security notes for later hardening

- All writes (join queue, accept, send message, end chat, presence)
  go through server-side API routes using the Supabase **service role**
  key, after checking the caller's identity from their auth token —
  the browser never writes to the database directly.
- Reads use Supabase Row Level Security: a visitor's Supabase session
  can only ever `select` their own waiting entry, their own room, and
  messages inside their own room. The admin's session can read
  everything (checked via the `admins` table).
- Before heavy production use, consider: rate-limiting `/api/chat/send`,
  adding profanity/abuse filtering, and rotating the service role key
  periodically.
