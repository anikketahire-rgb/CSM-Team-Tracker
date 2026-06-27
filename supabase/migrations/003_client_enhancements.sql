-- Migration 003: Client enhancements, item comments, sync logging
-- Run this in Supabase SQL Editor

-- 1. New client fields
ALTER TABLE clients ADD COLUMN IF NOT EXISTS report_frequency text default 'Weekly';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS categories text[] default '{Implementation,Issues,Enhancements,Process & Governance}';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS owner_pool jsonb default '[]';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone text default '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS timezone text default '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sheet_last_synced_at timestamptz;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sheet_sync_error text default '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS archived boolean default false;

-- 2. Background field on items
ALTER TABLE items ADD COLUMN IF NOT EXISTS background text default '';

-- 3. Item updates / comments table
CREATE TABLE IF NOT EXISTS item_updates (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references items(id) on delete cascade,
  update_date date not null,
  update_type text not null default 'Status Update',
  content text default '',
  author text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Allow multiple comments per item per date (no unique constraint)
-- This handles cases where multiple topics are discussed per meeting

CREATE INDEX IF NOT EXISTS item_updates_item_id on item_updates(item_id);
CREATE INDEX IF NOT EXISTS item_updates_update_date on item_updates(update_date desc);

-- 4. Sync log table
CREATE TABLE IF NOT EXISTS sync_log (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete cascade,
  direction text not null check (direction in ('push', 'pull')),
  status text not null check (status in ('success', 'error')),
  details text default '',
  items_affected integer default 0,
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS sync_log_client_id on sync_log(client_id);
CREATE INDEX IF NOT EXISTS sync_log_created_at on sync_log(created_at desc);

-- 5. RLS for new tables
ALTER TABLE item_updates enable row level security;
ALTER TABLE sync_log enable row level security;

-- item_updates policies
CREATE POLICY "Authenticated can read item_updates" ON item_updates FOR select USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert item_updates" ON item_updates FOR insert WITH check (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update item_updates" ON item_updates FOR update USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can delete item_updates" ON item_updates FOR delete USING (auth.role() = 'authenticated');

-- Allow anonymous read for item_updates (needed for public share pages)
CREATE POLICY "Anonymous can read item_updates" ON item_updates FOR select USING (true);

-- sync_log policies
CREATE POLICY "Authenticated can read sync_log" ON sync_log FOR select USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert sync_log" ON sync_log FOR insert WITH check (auth.role() = 'authenticated');

-- 6. Trigger to update updated_at on item_updates
CREATE OR REPLACE FUNCTION update_item_updates_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER item_updates_updated_at
  BEFORE UPDATE ON item_updates
  FOR EACH ROW EXECUTE FUNCTION update_item_updates_updated_at();

-- 7. Migrate existing last_update_text/date to item_updates (optional, for existing data)
-- Uncomment if you want to migrate old data:
-- INSERT INTO item_updates (item_id, update_date, update_type, content, author)
-- SELECT id, last_update_date::date, 'Status Update', last_update_text, ''
-- FROM items
-- WHERE last_update_text != '' AND last_update_date != '' AND last_update_date IS NOT NULL
-- ON CONFLICT DO NOTHING;
