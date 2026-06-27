-- Migration 003: Client enhancements, item comments, sync logging
-- Safe to re-run (uses IF NOT EXISTS throughout)

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
  source text default 'app',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS item_updates_item_id on item_updates(item_id);
CREATE INDEX IF NOT EXISTS item_updates_update_date on item_updates(update_date desc);

-- 4. Sync log table
CREATE TABLE IF NOT EXISTS sync_log (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete cascade,
  direction text not null,
  status text not null,
  items_synced integer default 0,
  details jsonb default '{}',
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS sync_log_client_id on sync_log(client_id);
CREATE INDEX IF NOT EXISTS sync_log_created_at on sync_log(created_at desc);

-- 5. RLS for new tables
ALTER TABLE item_updates enable row level security;
ALTER TABLE sync_log enable row level security;

-- Drop and recreate policies to avoid "already exists" errors
DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated can read item_updates" ON item_updates;
  DROP POLICY IF EXISTS "Authenticated can insert item_updates" ON item_updates;
  DROP POLICY IF EXISTS "Authenticated can update item_updates" ON item_updates;
  DROP POLICY IF EXISTS "Authenticated can delete item_updates" ON item_updates;
  DROP POLICY IF EXISTS "Anonymous can read item_updates" ON item_updates;
  DROP POLICY IF EXISTS "Authenticated can read sync_log" ON sync_log;
  DROP POLICY IF EXISTS "Authenticated can insert sync_log" ON sync_log;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Authenticated can read item_updates" ON item_updates FOR select USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert item_updates" ON item_updates FOR insert WITH check (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update item_updates" ON item_updates FOR update USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can delete item_updates" ON item_updates FOR delete USING (auth.role() = 'authenticated');
CREATE POLICY "Anonymous can read item_updates" ON item_updates FOR select USING (true);

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

DROP TRIGGER IF EXISTS item_updates_updated_at ON item_updates;
CREATE TRIGGER item_updates_updated_at
  BEFORE UPDATE ON item_updates
  FOR EACH ROW EXECUTE FUNCTION update_item_updates_updated_at();
