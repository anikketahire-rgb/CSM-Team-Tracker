-- CSM Team Tracker - Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (profiles - linked to Supabase Auth)
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null,
  role text not null default 'csm' check (role in ('admin', 'csm')),
  created_at timestamptz default now()
);

-- Clients table
create table if not exists clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  csm_name text default '',
  region text default '',
  industry text default '',
  health text default 'Green' check (health in ('Green', 'Amber', 'Red')),
  acv numeric default 0,
  renewal_date text default '',
  renewal_status text default 'New Account 1st Year',
  phase text default 'Implementation',
  sheet_id text default '',
  tab_name text default 'Implementation Tracker',
  email text default '',
  owners text[] default '{}',
  sync_enabled boolean default false,
  last_synced_at timestamptz,
  created_at timestamptz default now()
);

-- Items table
create table if not exists items (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id) on delete cascade,
  section text default '',
  item text not null,
  priority text default 'P2',
  status text default 'Not Started',
  owner text default '',
  eta text default '',
  start_date text default '',
  last_update_text text default '',
  last_update_date text default '',
  row_index integer default 0,
  created_at timestamptz default now()
);

-- Tickets table
create table if not exists tickets (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id) on delete cascade,
  subject text not null,
  description text default '',
  reporter text default '',
  priority text default 'P2',
  status text default 'Open',
  source text default 'Manual',
  deadline text default '',
  tags text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Activity log
create table if not exists activity_log (
  id uuid primary key default uuid_generate_v4(),
  actor text default '',
  type text default '',
  client text default '',
  message text default '',
  created_at timestamptz default now()
);

-- Indexes
create index if not exists items_client_id on items(client_id);
create index if not exists tickets_client_id on tickets(client_id);
create index if not exists activity_log_created_at on activity_log(created_at desc);

-- Row Level Security (RLS)
alter table users enable row level security;
alter table clients enable row level security;
alter table items enable row level security;
alter table tickets enable row level security;
alter table activity_log enable row level security;

-- Policies: authenticated users can read everything
create policy "Users can read all users" on users for select using (auth.role() = 'authenticated');
create policy "Users can read all clients" on clients for select using (auth.role() = 'authenticated');
create policy "Users can read all items" on items for select using (auth.role() = 'authenticated');
create policy "Users can read all tickets" on tickets for select using (auth.role() = 'authenticated');
create policy "Users can read all activity" on activity_log for select using (auth.role() = 'authenticated');

-- Policies: authenticated users can insert/update/delete
create policy "Users can insert clients" on clients for insert with check (auth.role() = 'authenticated');
create policy "Users can update clients" on clients for update using (auth.role() = 'authenticated');
create policy "Users can delete clients" on clients for delete using (auth.role() = 'authenticated');

create policy "Users can insert items" on items for insert with check (auth.role() = 'authenticated');
create policy "Users can update items" on items for update using (auth.role() = 'authenticated');
create policy "Users can delete items" on items for delete using (auth.role() = 'authenticated');

create policy "Users can insert tickets" on tickets for insert with check (auth.role() = 'authenticated');
create policy "Users can update tickets" on tickets for update using (auth.role() = 'authenticated');
create policy "Users can delete tickets" on tickets for delete using (auth.role() = 'authenticated');

create policy "Users can insert activity" on activity_log for insert with check (auth.role() = 'authenticated');

-- Allow anonymous read for client shareable pages
create policy "Anonymous can read clients" on clients for select using (true);
create policy "Anonymous can read items" on items for select using (true);
create policy "Anonymous can read tickets" on tickets for select using (true);

-- Trigger to update updated_at on tickets
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tickets_updated_at
  before update on tickets
  for each row execute function update_updated_at();
