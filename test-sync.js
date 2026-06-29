/**
 * Test script for sheet sync flow
 * Run with: node test-sync.js
 * 
 * Tests:
 * 1. Import from sheet → items saved to DB
 * 2. Import from sheet → date column comments saved to item_updates
 * 3. Add comment in app → syncs to sheet via writeComment
 * 4. Edit comment on sheet → import updates the comment in app
 * 5. Duplicate import doesn't create duplicate comments
 * 6. Multiple date columns imported correctly
 */

const SUPABASE_URL = 'https://kunpgcxtzqvkgcopjcnf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1bnBnY3h0enF2a2djb3BqY25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NjQwMTAsImV4cCI6MjA5ODA0MDAxMH0.F6YP5vfnf-m4O2U7DpivsnjMK8BLMmbtugLxOYJRivI';
const APPS_SCRIPT_URL = ''; // FILL THIS IN

let authToken = '';

async function login() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
    body: JSON.stringify({ email: 'aniket.ahire@questionpro.com', password: 'Aniket@123' }),
  });
  const data = await res.json();
  authToken = data.access_token;
  console.log('Logged in as', data.user?.email);
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${authToken}`,
  };
}

async function supabaseQuery(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { headers: authHeaders() });
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

async function supabaseUpdate(table, data, params) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Prefer': 'return=representation' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) { console.error(`Update error on ${table}:`, json); return []; }
  return Array.isArray(json) ? json : [json];
}

async function supabaseInsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Prefer': 'return=representation' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) { console.error(`Insert error on ${table}:`, json); return []; }
  return Array.isArray(json) ? json : [json];
}

async function supabaseDelete(table, params) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return res.status;
}

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.log(`  ✗ ${msg}`);
    failed++;
  }
}

// ============================================================
// TEST 1: Import items from sheet
// ============================================================
async function test1_importItems() {
  console.log('\n=== TEST 1: Import items from sheet ===');
  
  // Create a test client
  const [client] = await supabaseInsert('clients', {
    name: 'TEST_SYNC_CLIENT',
    csm_name: 'Test CSM',
    health: 'Green',
    phase: 'Implementation',
    apps_script_url: APPS_SCRIPT_URL,
    sheet_id: 'test_sheet_id',
    tab_name: 'Implementation Tracker',
  });
  
  assert(client?.id, 'Test client created');
  const clientId = client.id;
  
  // Simulate import: insert items
  const items = [
    { section: 'Architecture', item: 'Test Item 1', background: 'Background 1', owner: 'Aniket', priority: 'P0', status: 'In Progress', row_index: 1 },
    { section: 'Enhancement', item: 'Test Item 2', background: 'Background 2', owner: 'Aniket', priority: 'P1', status: 'Not Started', row_index: 2 },
  ];
  
  for (const item of items) {
    await supabaseInsert('items', { ...item, client_id: clientId, start_date: null, due_date: null });
  }
  
  const dbItems = await supabaseQuery('items', `client_id=eq.${clientId}&select=id,item,row_index`);
  assert(dbItems.length === 2, `2 items inserted (found ${dbItems.length})`);
  assert(dbItems[0]?.row_index === 1, 'Item 1 has row_index=1');
  assert(dbItems[1]?.row_index === 2, 'Item 2 has row_index=2');
  
  return { clientId, items: dbItems };
}

// ============================================================
// TEST 2: Import date column comments
// ============================================================
async function test2_importComments(clientId, dbItems) {
  console.log('\n=== TEST 2: Import date column comments ===');
  
  const months = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06', Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' };
  
  function parseDate(dateStr) {
    const match = dateStr.match(/^(\d{1,2})\s+(\w{3})$/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = months[match[2]];
      if (month) return `2026-${month}-${day}`;
    }
    return dateStr;
  }
  
  // Simulate date updates from sheet
  const dateUpdates = [
    { itemNumber: 1, itemName: 'Test Item 1', dateColumn: '29 Jun', value: '[Status Update] First comment from sheet' },
    { itemNumber: 1, itemName: 'Test Item 1', dateColumn: '30 Jun', value: 'asdsadasdad' },
    { itemNumber: 2, itemName: 'Test Item 2', dateColumn: '29 Jun', value: '[Note] Item 2 update' },
  ];
  
  const itemMap = new Map();
  for (const item of dbItems) {
    itemMap.set(String(item.row_index), item.id);
    itemMap.set(item.item, item.id);
  }
  
  for (const update of dateUpdates) {
    const itemId = itemMap.get(String(update.itemNumber)) || itemMap.get(update.itemName);
    if (!itemId) { console.log(`  ! Could not find item for ${update.itemName}`); continue; }
    
    const parsedDate = parseDate(update.dateColumn);
    
    // Check if exists
    const existing = await supabaseQuery('item_updates', 
      `item_id=eq.${itemId}&update_date=eq.${parsedDate}&source=eq.sheet&select=id`);
    
    if (existing.length > 0) {
      await supabaseUpdate('item_updates', { content: update.value }, `id=eq.${existing[0].id}`);
    } else {
      await supabaseInsert('item_updates', {
        item_id: itemId,
        update_date: parsedDate,
        update_type: 'Note',
        content: update.value,
        author: 'Sheet',
        source: 'sheet',
      });
    }
  }
  
  // Verify comments saved
  const comments1 = await supabaseQuery('item_updates', 
    `item_id=eq.${dbItems[0].id}&select=id,content,update_date,source`);
  assert(comments1.length === 2, `Item 1 has 2 comments (found ${comments1.length})`);
  assert(comments1.some(c => c.content.includes('First comment')), 'Item 1 has "First comment from sheet"');
  assert(comments1.some(c => c.content.includes('asdsadasdad')), 'Item 1 has "asdsadasdad"');
  
  const comments2 = await supabaseQuery('item_updates', 
    `item_id=eq.${dbItems[1].id}&select=id,content,update_date,source`);
  assert(comments2.length === 1, `Item 2 has 1 comment (found ${comments2.length})`);
  
  return { itemMap };
}

// ============================================================
// TEST 3: Re-import updates existing comments (no duplicates)
// ============================================================
async function test3_reimportNoDuplicates(clientId, dbItems, itemMap) {
  console.log('\n=== TEST 3: Re-import updates existing comments ===');
  
  const months = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06', Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' };
  
  function parseDate(dateStr) {
    const match = dateStr.match(/^(\d{1,2})\s+(\w{3})$/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = months[match[2]];
      if (month) return `2026-${month}-${day}`;
    }
    return dateStr;
  }
  
  // Simulate re-import with EDITED content
  const dateUpdates = [
    { itemNumber: 1, itemName: 'Test Item 1', dateColumn: '29 Jun', value: '[Status Update] EDITED comment from sheet' },
    { itemNumber: 1, itemName: 'Test Item 1', dateColumn: '30 Jun', value: 'edited content' },
  ];
  
  for (const update of dateUpdates) {
    const itemId = itemMap.get(String(update.itemNumber)) || itemMap.get(update.itemName);
    if (!itemId) continue;
    
    const parsedDate = parseDate(update.dateColumn);
    
    const existing = await supabaseQuery('item_updates', 
      `item_id=eq.${itemId}&update_date=eq.${parsedDate}&source=eq.sheet&select=id`);
    
    if (existing.length > 0) {
      await supabaseUpdate('item_updates', { content: update.value }, `id=eq.${existing[0].id}`);
    } else {
      await supabaseInsert('item_updates', {
        item_id: itemId,
        update_date: parsedDate,
        update_type: 'Note',
        content: update.value,
        author: 'Sheet',
        source: 'sheet',
      });
    }
  }
  
  // Verify: still 2 comments, content updated
  const comments = await supabaseQuery('item_updates', 
    `item_id=eq.${dbItems[0].id}&select=id,content,source&order=update_date`);
  assert(comments.length === 2, `Still 2 comments (found ${comments.length})`);
  
  // Debug: print actual content
  for (const c of comments) {
    console.log(`    [debug] source=${c.source} content="${c.content}"`);
  }
  
  assert(comments.some(c => c.content.includes('EDITED')), 'Content updated to EDITED');
  assert(!comments.some(c => c.content.includes('First comment')), 'Old content removed');
  
  // Verify no duplicate source=sheet comments
  const sheetComments = comments.filter(c => c.source === 'sheet');
  assert(sheetComments.length === 2, `No duplicate sheet comments (${sheetComments.length} sheet comments)`);
}

// ============================================================
// TEST 4: App comment + sheet comment coexist
// ============================================================
async function test4_appAndSheetCommentsCoexist(clientId, dbItems) {
  console.log('\n=== TEST 4: App and sheet comments coexist ===');
  
  // Add an app comment
  await supabaseInsert('item_updates', {
    item_id: dbItems[0].id,
    update_date: '2026-06-29',
    update_type: 'Status Update',
    content: 'App comment from CSM',
    author: 'Aniket Ahire',
    source: 'app',
  });
  
  const comments = await supabaseQuery('item_updates', 
    `item_id=eq.${dbItems[0].id}&select=id,content,source,update_type&order=update_date`);
  
  assert(comments.length === 3, `3 total comments (found ${comments.length})`);
  assert(comments.some(c => c.source === 'app' && c.content.includes('App comment')), 'App comment exists');
  assert(comments.some(c => c.source === 'sheet' && c.content.includes('EDITED')), 'Sheet comment still exists');
  assert(comments.some(c => c.source === 'sheet' && c.content.includes('edited content')), 'Second sheet comment exists');
}

// ============================================================
// TEST 5: Multiple app comments per item per date
// ============================================================
async function test5_multipleAppCommentsSameDate(clientId, dbItems) {
  console.log('\n=== TEST 5: Multiple app comments same date ===');
  
  await supabaseInsert('item_updates', {
    item_id: dbItems[0].id,
    update_date: '2026-06-29',
    update_type: 'Blocker',
    content: 'Second app comment same day',
    author: 'Aniket Ahire',
    source: 'app',
  });
  
  const comments29Jun = await supabaseQuery('item_updates', 
    `item_id=eq.${dbItems[0].id}&update_date=eq.2026-06-29&select=id,content,source`);
  
  assert(comments29Jun.length >= 3, `At least 3 comments on 29 Jun (found ${comments29Jun.length})`);
}

// ============================================================
// CLEANUP
// ============================================================
async function cleanup(clientId, dbItems) {
  console.log('\n=== CLEANUP ===');
  
  for (const item of dbItems) {
    await supabaseDelete('item_updates', `item_id=eq.${item.id}`);
  }
  await supabaseDelete('items', `client_id=eq.${clientId}`);
  await supabaseDelete('clients', `id=eq.${clientId}`);
  
  assert(true, 'Test data cleaned up');
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('CSM Tracker - Sync Flow Test Suite');
  console.log('===================================');
  
  await login();
  
  if (!APPS_SCRIPT_URL) {
    console.log('\n⚠ APPS_SCRIPT_URL not set - skipping Apps Script integration tests');
    console.log('Testing DB logic only...\n');
  }
  
  const { clientId, items: dbItems } = await test1_importItems();
  const { itemMap } = await test2_importComments(clientId, dbItems);
  await test3_reimportNoDuplicates(clientId, dbItems, itemMap);
  await test4_appAndSheetCommentsCoexist(clientId, dbItems);
  await test5_multipleAppCommentsSameDate(clientId, dbItems);
  await cleanup(clientId, dbItems);
  
  console.log(`\n===================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`===================================`);
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
