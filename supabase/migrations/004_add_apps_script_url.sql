-- Migration 004: Add per-client Apps Script URL
-- Run this in Supabase SQL Editor

ALTER TABLE clients ADD COLUMN IF NOT EXISTS apps_script_url text default '';
