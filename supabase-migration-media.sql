-- Migration: Add event_media table
-- Run this in Supabase SQL Editor if you already have the base schema

create table public.event_media (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  file_name text not null,
  file_path text not null,
  file_size integer not null default 0,
  file_type text not null default '',
  tag text not null default 'social_media' check (tag in ('social_media', 'recap', 'marketing_asset')),
  uploaded_by text not null default '',
  created_at timestamptz default now() not null
);

create index idx_media_event_id on public.event_media(event_id);

alter table public.event_media enable row level security;

create policy "Users can view media" on public.event_media
  for select to authenticated using (true);

create policy "Users can insert media" on public.event_media
  for insert to authenticated with check (true);

create policy "Users can delete media" on public.event_media
  for delete to authenticated using (true);
