-- Migration 006: Drop apps_script_url column (replaced by Google Sheets API)

ALTER TABLE clients DROP COLUMN IF EXISTS apps_script_url;
