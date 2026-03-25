-- ============================================
-- Harley Event Dashboard - Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Events table
create table public.events (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  date date not null,
  location text not null default '',
  owner text not null default '',
  status text not null default 'idea' check (status in ('idea', 'planning', 'in_progress', 'ready_for_execution', 'live_event', 'completed')),
  description text not null default '',
  onedrive_link text,
  is_live_mode boolean not null default false,
  user_id uuid references auth.users(id) on delete cascade not null,
  attendance integer,
  recap_notes text,
  sales_estimate numeric,
  is_archived boolean not null default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Checklist items
create table public.checklist_items (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  section text not null,
  label text not null,
  is_checked boolean not null default false,
  assignee text,
  comment text,
  sort_order integer not null default 0,
  created_at timestamptz default now() not null
);

-- Event documents
create table public.event_documents (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  file_name text not null,
  file_path text not null,
  file_size integer not null default 0,
  tag text not null default 'other' check (tag in ('contract', 'invoice', 'flyer', 'photo', 'receipt', 'other')),
  uploaded_by text not null default '',
  created_at timestamptz default now() not null
);

-- Event comments
create table public.event_comments (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  user_email text not null,
  content text not null,
  created_at timestamptz default now() not null
);

-- Indexes
create index idx_events_user_id on public.events(user_id);
create index idx_events_status on public.events(status);
create index idx_events_date on public.events(date);
create index idx_checklist_event_id on public.checklist_items(event_id);
create index idx_documents_event_id on public.event_documents(event_id);
create index idx_comments_event_id on public.event_comments(event_id);

-- Row Level Security
alter table public.events enable row level security;
alter table public.checklist_items enable row level security;
alter table public.event_documents enable row level security;
alter table public.event_comments enable row level security;

-- Policies: authenticated users can CRUD their own events
create policy "Users can view all events" on public.events
  for select to authenticated using (true);

create policy "Users can insert events" on public.events
  for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can update events" on public.events
  for update to authenticated using (true);

create policy "Users can delete own events" on public.events
  for delete to authenticated using (auth.uid() = user_id);

-- Checklist: anyone authenticated can manage
create policy "Users can view checklist items" on public.checklist_items
  for select to authenticated using (true);

create policy "Users can insert checklist items" on public.checklist_items
  for insert to authenticated with check (true);

create policy "Users can update checklist items" on public.checklist_items
  for update to authenticated using (true);

create policy "Users can delete checklist items" on public.checklist_items
  for delete to authenticated using (true);

-- Documents
create policy "Users can view documents" on public.event_documents
  for select to authenticated using (true);

create policy "Users can insert documents" on public.event_documents
  for insert to authenticated with check (true);

create policy "Users can delete documents" on public.event_documents
  for delete to authenticated using (true);

-- Comments
create policy "Users can view comments" on public.event_comments
  for select to authenticated using (true);

create policy "Users can insert comments" on public.event_comments
  for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can delete own comments" on public.event_comments
  for delete to authenticated using (auth.uid() = user_id);

-- Storage bucket for event documents
insert into storage.buckets (id, name, public)
values ('event-documents', 'event-documents', true)
on conflict do nothing;

create policy "Authenticated users can upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'event-documents');

create policy "Anyone can view" on storage.objects
  for select to authenticated using (bucket_id = 'event-documents');

create policy "Authenticated users can delete" on storage.objects
  for delete to authenticated using (bucket_id = 'event-documents');

-- Function to auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_events_updated
  before update on public.events
  for each row execute function public.handle_updated_at();
