import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { readSheetData } from '@/lib/google-sheets';

const MONTHS: Record<string, string> = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06', Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' };

function parseDate(dateStr: string): string {
  const match = dateStr.match(/^(\d{1,2})\s+(\w{3})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = MONTHS[match[2]];
    if (month) return `2026-${month}-${day}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return dateStr;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { client_id, sheet_id, tab_name } = body;

  if (!client_id || !sheet_id) {
    return NextResponse.json({ error: 'Missing client_id or sheet_id' }, { status: 400 });
  }

  try {
    const { items, dateUpdates } = await readSheetData(
      sheet_id,
      tab_name || 'Implementation Tracker',
    );

    // Upsert items
    for (const item of items) {
      const itemName = item.item;
      if (!itemName) continue;

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
        row_index: item.row_index || 0,
      };

      if (existing) {
        await supabase.from('items').update(rowData).eq('id', existing.id);
      } else {
        await supabase.from('items').insert(rowData);
      }
    }

    // Import date column updates as item_updates
    if (dateUpdates.length > 0) {
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

      for (const update of dateUpdates) {
        const itemId = itemMap.get(String(update.itemNumber)) || itemMap.get(update.itemName);
        if (!itemId) continue;

        const parsedDate = parseDate(update.dateColumn);

        const { data: existingUpdate } = await supabase
          .from('item_updates')
          .select('id')
          .eq('item_id', itemId)
          .eq('update_date', parsedDate)
          .eq('source', 'sheet')
          .maybeSingle();

        if (existingUpdate) {
          await supabase.from('item_updates').update({ content: update.value }).eq('id', existingUpdate.id);
        } else {
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

    await supabase
      .from('clients')
      .update({ sheet_last_synced_at: new Date().toISOString(), sheet_sync_error: null })
      .eq('id', client_id);

    await supabase.from('sync_log').insert({
      client_id,
      direction: 'pull',
      status: 'success',
      details: `Imported ${items.length} items, ${dateUpdates.length} comments`,
      items_affected: items.length,
    });

    return NextResponse.json({ success: true, itemsImported: items.length, commentsImported: dateUpdates.length });
  } catch (error: any) {
    console.error('Import from sheet error:', error);
    await supabase
      .from('clients')
      .update({ sheet_sync_error: error.message || String(error) })
      .eq('id', client_id);
    return NextResponse.json({ error: error.message || 'Failed to import from sheet' }, { status: 500 });
  }
}
