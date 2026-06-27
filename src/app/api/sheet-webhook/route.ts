import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Webhook: Apps Script sends onEdit events here
export async function POST(req: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const { action, sheetId, tabName, updates } = body;

    if (action === 'onEdit' && sheetId && updates) {
      // Find client by sheet_id
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('sheet_id', sheetId)
        .single();

      if (!client) {
        return NextResponse.json({ error: 'Client not found for sheet' }, { status: 404 });
      }

      // Process each date column update
      for (const update of updates) {
        const { itemNumber, dateColumn, value } = update;

        // Find item by position (itemNumber = row index - header rows)
        const { data: items } = await supabase
          .from('items')
          .select('id')
          .eq('client_id', client.id)
          .order('created_at');

        if (items && items[itemNumber - 1]) {
          const itemId = items[itemNumber - 1].id;

          // Upsert item_update
          await supabase
            .from('item_updates')
            .upsert({
              item_id: itemId,
              update_date: dateColumn,
              source: 'sheet',
              content: value || '',
            }, {
              onConflict: 'item_id,update_date,source',
            });
        }
      }

      // Log the sync
      await supabase.from('sync_log').insert({
        client_id: client.id,
        direction: 'sheet_to_app',
        status: 'success',
        items_synced: updates.length,
        details: { action: 'onEdit', tabName },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Sheet webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
