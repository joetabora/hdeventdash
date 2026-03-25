# Harley Event Dashboard

A full-stack event management dashboard built with **Next.js**, **Tailwind CSS**, and **Supabase**. Designed for planning, tracking, and executing events with a Harley-Davidson-inspired dark theme.

## Features

- **Authentication** — Sign up, sign in, and session management via Supabase Auth
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

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) (Auth, Database, Storage)
- [dnd-kit](https://dndkit.com/) (Drag and drop)
- [Lucide React](https://lucide.dev/) (Icons)
- [date-fns](https://date-fns.org/) (Date formatting)

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
3. Copy your project URL and anon key from **Settings > API**

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

## Deployment on Vercel

1. Push to GitHub
2. Import the repo into [Vercel](https://vercel.com/)
3. Add environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
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
