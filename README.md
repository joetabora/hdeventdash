# Harley Event Dashboard

A full-stack event management dashboard built with **Next.js**, **Tailwind CSS**, and **Supabase**. Designed for planning, tracking, and executing events with a Harley-Davidson-inspired dark theme.

## Features

- **Authentication** — Sign in and session management via Supabase Auth
- **Dashboard Views** — Kanban board (drag-and-drop), Calendar, and List views
- **Event Management** — Create, edit, and delete events with full detail pages
- **Checklist System** — Grouped checklist sections (Booking, Marketing, Alignment, Sales) with assignees and notes
- **Auto-Readiness Detection** — Automatically detects when all checklist items are complete and suggests a status update
- **Document Management** — Upload, tag, view, and download files via Supabase Storage
- **Comments** — Threaded comments with timestamps and user attribution
- **Event Recap** — Track attendance, sales estimates, and notes for completed events
- **Event Live Mode** — Simplified checklist-focused UI for day-of execution
- **Filtering** — Search events, filter by location and owner
- **Archive** — Archive completed events to keep the dashboard clean
- **Responsive** — Works on desktop, tablet, and mobile
- **Push notifications (optional)** — Firebase Cloud Messaging for 3-day / 1-day event reminders and at-risk alerts
- **Vendors** — Organization vendor directory, attach vendors to events with roles and participation status, history per vendor
- **Monthly budgets** — Per-month, per-location caps; compare to sum of event planned budgets on the dashboard (green / yellow / red); managers set caps and event budgets

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) (Auth, Database, Storage)
- [dnd-kit](https://dndkit.com/) (Drag and drop)
- [Lucide React](https://lucide.dev/) (Icons)
- [date-fns](https://date-fns.org/) (Date formatting)
- [Firebase](https://firebase.google.com/) (optional: FCM web push)

## Getting Started

### 1. Clone the repo

```bash
git clone <repo-url>
cd MKEHD-Dashboard
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com/)
2. Go to **SQL Editor** and run the contents of `supabase-schema.sql`
3. For push notifications, also run `supabase-migration-push-notifications.sql`
4. For vendors (directory + event links + history), run `supabase-migration-vendors.sql` after org + RBAC migrations (`supabase-migration-organizations.sql`, `supabase-migration-rbac.sql`)
5. For monthly budgets and event planned/actual amounts, run `supabase-migration-budgets.sql` after ROI and event-type migrations (it replaces `events_enforce_staff_update` and must include `event_type` and ROI columns in that function)
6. Run `supabase-migration-create-event-with-checklist-rpc.sql` after budgets (atomic `create_event_with_checklist` RPC used by the app when creating events)
7. Copy your project URL and anon key from **Settings > API**

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Push notifications (Firebase Cloud Messaging)

Lightweight setup: **free Spark** Firebase plan + **one scheduled HTTP POST** per day (e.g. GitHub Actions `schedule`, [cron-job.org](https://cron-job.org) with POST, or another scheduler that can send a `Authorization` header).

### 1. Firebase

1. Create a Firebase project and add a **Web** app.
2. Enable **Cloud Messaging** (Project settings → Cloud Messaging).
3. Under **Web Push certificates**, generate a key pair — set `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.
4. Copy the web app config into `NEXT_PUBLIC_FIREBASE_*` env vars.
5. **Project settings → Service accounts → Generate new private key** — base64-encode the JSON and set `FIREBASE_SERVICE_ACCOUNT_BASE64` (recommended for Vercel).

### 2. Supabase

Run `supabase-migration-push-notifications.sql` (tables `push_tokens`, `notification_sent`).  
Add **Settings → API → service_role** key as `SUPABASE_SERVICE_ROLE_KEY` **only** on the server (e.g. Vercel env). Never expose it in the browser.

### 3. Cron endpoint

`POST` only: `https://<your-domain>/api/cron/push-notifications`

- Header **`Authorization: Bearer <CRON_SECRET>`** (required). Query-string secrets are not accepted.

Set `CRON_SECRET` in your environment to a long random value. **Vercel Cron** invokes routes with **GET**, so it cannot call this endpoint; schedule a **POST** from GitHub Actions, cron-job.org (enable POST + custom header), or similar once per day.

### 4. Behaviour

Notifications go to the **event creator** (`events.user_id`) if they enabled alerts and stored an FCM token.

| Trigger | When |
|--------|------|
| 3 days away | Calendar day is exactly 3 days before the event |
| 1 day away | Day before the event |
| At risk | Same rules as the dashboard (within 5 days, checklist not 100%, not completed/live) — at most **once per UTC day** per event |

## Deployment on Vercel

1. Push to GitHub
2. Import the repo into [Vercel](https://vercel.com/)
3. Add environment variables (Supabase, optional Firebase + `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `FIREBASE_SERVICE_ACCOUNT_BASE64`, `NEXT_PUBLIC_APP_URL`, etc.)
4. Deploy

## Project Structure

```
src/
├── app/
│   ├── auth/           # Login, signup, callback
│   ├── dashboard/      # Main dashboard (Kanban, Calendar, List)
│   ├── events/         # Event creation and detail pages
│   ├── globals.css     # Harley theme + Tailwind config
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Landing page
├── components/
│   ├── dashboard/      # Kanban board, calendar, list, filters
│   ├── events/         # Event card, form, checklist, docs, comments, recap
│   ├── layout/         # Sidebar
│   └── ui/             # Button, Badge, Modal, Input
├── lib/
│   ├── events.ts       # All Supabase CRUD operations
│   └── supabase/       # Supabase client (browser, server, middleware)
└── types/
    └── database.ts     # TypeScript types and constants
```

## Database Schema

See `supabase-schema.sql` for the full schema including:

- `events` — Core event data
- `checklist_items` — Checklist with sections, assignees, comments
- `event_documents` — File metadata linked to Supabase Storage
- `event_comments` — User comments on events
- Row Level Security policies
- Storage bucket for document uploads
