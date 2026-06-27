-- Migration 002: Add due_date, custom_statuses, client share links
-- Run this in Supabase SQL Editor

-- 1. Add due_date column to items table (replaces ETA)
ALTER TABLE items ADD COLUMN IF NOT EXISTS due_date text default '';

-- Migrate existing eta data to due_date where due_date is empty
UPDATE items SET due_date = eta WHERE due_date = '' AND eta != '';

-- 2. Custom statuses table (admin-managed, per-type)
CREATE TABLE IF NOT EXISTS custom_statuses (
  id uuid primary key default uuid_generate_v4(),
  category text not null check (category in ('item', 'ticket')),
  label text not null,
  color text default '#7756c4',
  sort_order integer default 0,
  created_at timestamptz default now(),
  unique(category, label)
);

-- Insert default item statuses
INSERT INTO custom_statuses (category, label, color, sort_order) VALUES
  ('item', 'Not Started', '#9499b8', 0),
  ('item', 'In Progress', '#2979c2', 1),
  ('item', 'Pending Client', '#7756c4', 2),
  ('item', 'Completed', '#12a06a', 3),
  ('item', 'On Hold', '#c47c17', 4),
  ('item', 'Blocked', '#d03d3b', 5),
  ('item', 'Delayed', '#d03d3b', 6)
ON CONFLICT (category, label) DO NOTHING;

-- Insert default ticket statuses
INSERT INTO custom_statuses (category, label, color, sort_order) VALUES
  ('ticket', 'Open', '#2979c2', 0),
  ('ticket', 'In Progress', '#2979c2', 1),
  ('ticket', 'Waiting on Client', '#7756c4', 2),
  ('ticket', 'Resolved', '#12a06a', 3),
  ('ticket', 'Closed', '#9499b8', 4),
  ('ticket', 'On Hold', '#c47c17', 5)
ON CONFLICT (category, label) DO NOTHING;

-- 3. Add share_token to clients table for public shareable links
ALTER TABLE clients ADD COLUMN IF NOT EXISTS share_token text default '';

-- Generate share tokens for existing clients
UPDATE clients SET share_token = substr(md5(random()::text), 1, 12) WHERE share_token = '';

-- 4. RLS for custom_statuses
ALTER TABLE custom_statuses enable row level security;
CREATE POLICY "Authenticated can read statuses" ON custom_statuses FOR select USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert statuses" ON custom_statuses FOR insert WITH check (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update statuses" ON custom_statuses FOR update USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can delete statuses" ON custom_statuses FOR delete USING (auth.role() = 'authenticated');

-- Allow anonymous read for custom_statuses (needed for public share pages)
CREATE POLICY "Anonymous can read statuses" ON custom_statuses FOR select USING (true);
