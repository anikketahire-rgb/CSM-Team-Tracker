import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncItemsToSheet } from '@/lib/google-sheets';

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
    const { data: items, error: fetchError } = await supabase
      .from('items')
      .select('*')
      .eq('client_id', client_id);

    if (fetchError) throw fetchError;

    const { data: client } = await supabase
      .from('clients')
      .select('name, csm_name, report_frequency')
      .eq('id', client_id)
      .single();

    const result = await syncItemsToSheet(
      sheet_id,
      tab_name || 'Implementation Tracker',
      items || [],
      client?.csm_name || '',
      client?.report_frequency || 'Weekly',
    );

    await supabase
      .from('clients')
      .update({ sheet_last_synced_at: new Date().toISOString(), sheet_sync_error: null })
      .eq('id', client_id);

    await supabase.from('sync_log').insert({
      client_id,
      direction: 'push',
      status: 'success',
      details: `Synced ${result.itemsSynced} items to sheet`,
      items_affected: result.itemsSynced,
    });

    return NextResponse.json({ success: true, itemsSynced: result.itemsSynced });
  } catch (error: any) {
    console.error('Sync to sheet error:', error);
    await supabase
      .from('clients')
      .update({ sheet_sync_error: error.message || String(error) })
      .eq('id', client_id);
    return NextResponse.json({ error: error.message || 'Failed to sync to sheet' }, { status: 500 });
  }
}
