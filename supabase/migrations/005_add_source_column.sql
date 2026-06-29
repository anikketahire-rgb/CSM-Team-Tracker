-- Migration 005: Add source column to item_updates
-- The source column was in migration 003 but wasn't applied

ALTER TABLE item_updates ADD COLUMN IF NOT EXISTS source text default 'app';
