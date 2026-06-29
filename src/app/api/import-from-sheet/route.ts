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
      items_synced: result.itemsImported || 0,
    });

    return NextResponse.json({ success: true, itemsImported: result.itemsImported || 0, items: result.items || [], dateUpdates: result.dateUpdates || [] });
  } catch (error) {
    console.error('Import from sheet error:', error);
    await supabase
      .from('clients')
      .update({ sheet_sync_error: String(error) })
      .eq('id', client_id);
    return NextResponse.json({ error: 'Failed to import from sheet' }, { status: 500 });
  }
}
