import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { client_id, sheet_id, tab_name, apps_script_url } = body;

  if (!client_id || !sheet_id) {
    return NextResponse.json({ error: 'Missing client_id or sheet_id' }, { status: 400 });
  }

  if (!apps_script_url) {
    return NextResponse.json({ error: 'No Apps Script URL configured for this client.' }, { status: 400 });
  }

  try {
    const response = await fetch(apps_script_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'importFromSheet',
        sheetId: sheet_id,
        tabName: tab_name || 'Implementation Tracker',
      }),
    });

    const result = await response.json();

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const items = result.items || [];
    const dateUpdates = result.dateUpdates || [];

    // Upsert items (update existing by name, insert new ones)
    for (const item of items) {
      const itemName = String(item.item || '').trim();
      if (!itemName) continue;

      // Check if item already exists
      const { data: existing } = await supabase
        .from('items')
        .select('id')
        .eq('client_id', client_id)
        .eq('item', itemName)
        .maybeSingle();

      const rowData = {
        client_id,
        section: item.section || '',
        item: itemName,
        background: item.background || '',
        owner: item.owner || '',
        priority: item.priority || 'P2',
        status: item.status || 'Not Started',
        start_date: item.start_date || null,
        due_date: item.due_date || null,
        row_index: item.item_number || 0,
      };

      if (existing) {
        // Update existing item (preserves item_updates FK)
        await supabase.from('items').update(rowData).eq('id', existing.id);
      } else {
        // Insert new item
        await supabase.from('items').insert(rowData);
      }
    }

    // Import date column updates as item_updates
    if (dateUpdates.length > 0) {
      // Fetch all items for this client to map item_number → item_id
      const { data: clientItems } = await supabase
        .from('items')
        .select('id, row_index, item')
        .eq('client_id', client_id);

      const itemMap = new Map<string, string>();
      if (clientItems) {
        for (const ci of clientItems) {
          itemMap.set(String(ci.row_index), ci.id);
          itemMap.set(ci.item, ci.id);
        }
      }

      const months: Record<string, string> = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06', Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' };

      for (const update of dateUpdates) {
        const itemId = itemMap.get(String(update.itemNumber)) || itemMap.get(update.itemName);
        if (!itemId) continue;

        // Parse "29 Jun" → "2026-06-29"
        let parsedDate = update.dateColumn;
        const match = String(update.dateColumn).match(/^(\d{1,2})\s+(\w{3})$/);
        if (match) {
          const day = match[1].padStart(2, '0');
          const month = months[match[2]];
          if (month) parsedDate = `2026-${month}-${day}`;
        }

        // Check if this update already exists
        const { data: existingUpdate } = await supabase
          .from('item_updates')
          .select('id')
          .eq('item_id', itemId)
          .eq('update_date', parsedDate)
          .eq('source', 'sheet')
          .maybeSingle();

        if (existingUpdate) {
          // Update existing
          await supabase.from('item_updates').update({ content: update.value }).eq('id', existingUpdate.id);
        } else {
          // Insert new
          await supabase.from('item_updates').insert({
            item_id: itemId,
            update_date: parsedDate,
            update_type: 'Note',
            content: update.value,
            author: 'Sheet',
            source: 'sheet',
          });
        }
      }
    }

    // Update last synced timestamp
    await supabase
      .from('clients')
      .update({ sheet_last_synced_at: new Date().toISOString(), sheet_sync_error: null })
      .eq('id', client_id);

    // Log sync
    await supabase.from('sync_log').insert({
      client_id,
      direction: 'import',
      status: 'success',
      items_synced: items.length,
    });

    return NextResponse.json({ success: true, itemsImported: items.length, commentsImported: dateUpdates.length });
  } catch (error) {
    console.error('Import from sheet error:', error);
    await supabase
      .from('clients')
      .update({ sheet_sync_error: String(error) })
      .eq('id', client_id);
    return NextResponse.json({ error: 'Failed to import from sheet' }, { status: 500 });
  }
}
