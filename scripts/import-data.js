#!/usr/bin/env node

/**
 * Data Import Script
 * Imports Honda and FirstBank data from Google Sheets into Supabase
 *
 * Usage: node scripts/import-data.js
 * Requires: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
 * (uses service role key for admin operations - set SUPABASE_SERVICE_ROLE_KEY)
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const SHEETS = [
  {
    name: 'FirstBank',
    sheetId: '1N4ZyFzm5QssfU5fFTVQJbN9q_t9m7ERJswJ8AtTH_PQ',
    tabName: 'Implementation Tracker',
    csm: 'Aniket',
    region: 'US',
    industry: 'Banking',
  },
  {
    name: 'Honda',
    sheetId: '1F0BugWVYxdedsWcCcKLoiQQwfa18UPvB',
    tabName: 'Implementation Tracker',
    csm: 'Aniket',
    region: 'US',
    industry: 'Automotive',
  },
];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchSheetData(sheetId, tabName) {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
  console.log(`  Fetching: ${csvUrl}`);
  const res = await fetch(csvUrl);
  if (!res.ok) {
    console.log(`  WARNING: Could not fetch sheet data (${res.status}). Skipping items import.`);
    return null;
  }
  const text = await res.text();
  return parseCSV(text);
}

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h.trim()] = (values[idx] || '').trim(); });
    rows.push(row);
  }
  return { headers, rows };
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQuotes = !inQuotes; }
    else if (line[i] === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += line[i]; }
  }
  result.push(current);
  return result;
}

function mapPriority(raw) {
  if (!raw) return 'P2';
  const r = raw.toLowerCase().trim();
  if (r.includes('p0') || r.includes('critical')) return 'P0';
  if (r.includes('p1') || r.includes('urgent') || r.includes('high')) return 'P1';
  if (r.includes('p3') || r.includes('low')) return 'P3';
  return 'P2';
}

function mapStatus(raw) {
  if (!raw) return 'Not Started';
  const r = raw.toLowerCase().trim();
  if (r.includes('completed') || r.includes('done')) return 'Completed';
  if (r.includes('progress') || r.includes('started')) return 'In Progress';
  if (r.includes('blocked')) return 'Blocked';
  if (r.includes('delayed')) return 'Delayed';
  if (r.includes('hold')) return 'On Hold';
  if (r.includes('pending')) return 'Pending Client';
  return 'Not Started';
}

async function importSheet(sheetConfig) {
  console.log(`\n--- Importing ${sheetConfig.name} ---`);

  // Create client
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .upsert({
      name: sheetConfig.name,
      csm_name: sheetConfig.csm,
      region: sheetConfig.region,
      industry: sheetConfig.industry,
      health: 'Green',
      phase: 'Implementation',
      sheet_id: sheetConfig.sheetId,
      tab_name: sheetConfig.tabName,
    }, { onConflict: 'name' })
    .select()
    .single();

  if (clientErr) {
    console.log(`  ERROR creating client: ${clientErr.message}`);
    return;
  }
  console.log(`  Client: ${client.name} (${client.id})`);

  // Fetch sheet data
  const data = await fetchSheetData(sheetConfig.sheetId, sheetConfig.tabName);
  if (!data || !data.rows.length) {
    console.log('  No items found in sheet');
    return;
  }

  console.log(`  Found ${data.rows.length} rows`);
  console.log(`  Headers: ${data.headers.join(', ')}`);

  // Detect column names (flexible matching)
  const findCol = (...patterns) => {
    for (const p of patterns) {
      const found = data.headers.find(h => h.toLowerCase().includes(p.toLowerCase()));
      if (found) return found;
    }
    return null;
  };

  const colSection = findCol('implementation step', 'section', 'category');
  const colItem = findCol('item name', 'item', 'task', 'step');
  const colPriority = findCol('priority');
  const colStatus = findCol('status');
  const colOwner = findCol('owner');
  const colETA = findCol('eta', 'due date', 'deadline');

  console.log(`  Mapped columns: section=${colSection}, item=${colItem}, priority=${colPriority}, status=${colStatus}`);

  // Insert items
  const items = data.rows
    .filter(row => colItem && row[colItem])
    .map((row, idx) => ({
      client_id: client.id,
      section: colSection ? row[colSection] : '',
      item: colItem ? row[colItem] : `Item ${idx + 1}`,
      priority: colPriority ? mapPriority(row[colPriority]) : 'P2',
      status: colStatus ? mapStatus(row[colStatus]) : 'Not Started',
      owner: colOwner ? row[colOwner] : '',
      eta: colETA ? row[colETA] : '',
      row_index: idx + 1,
    }));

  if (items.length > 0) {
    // Delete existing items for this client first
    await supabase.from('items').delete().eq('client_id', client.id);

    const { error: itemsErr } = await supabase.from('items').insert(items);
    if (itemsErr) {
      console.log(`  ERROR inserting items: ${itemsErr.message}`);
    } else {
      console.log(`  Imported ${items.length} items`);
    }
  }

  // Log activity
  await supabase.from('activity_log').insert({
    actor: 'System',
    type: 'create',
    client: client.name,
    message: `Imported ${items.length} items from Google Sheets`,
  });
}

async function main() {
  console.log('CSM Team Tracker - Data Import');
  console.log('==============================');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERROR: Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
  }

  for (const sheet of SHEETS) {
    await importSheet(sheet);
  }

  console.log('\n==============================');
  console.log('Import complete!');
}

main().catch(console.error);
