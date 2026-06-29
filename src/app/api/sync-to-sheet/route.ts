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
    // Fetch items for this client
    const { data: items, error: fetchError } = await supabase
      .from('items')
      .select('*')
      .eq('client_id', client_id);

    if (fetchError) throw fetchError;

    // Fetch client info
    const { data: client } = await supabase
      .from('clients')
      .select('name, csm_name, report_frequency')
      .eq('id', client_id)
      .single();

    const response = await fetch(apps_script_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'syncToSheet',
        sheetId: sheet_id,
        tabName: tab_name || 'Implementation Tracker',
        clientName: client?.name,
        csmName: client?.csm_name,
        reportFrequency: client?.report_frequency || 'Weekly',
        items: items || [],
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
      direction: 'export',
      status: 'success',
      items_synced: items?.length || 0,
    });

    return NextResponse.json({ success: true, itemsSynced: items?.length || 0 });
  } catch (error) {
    console.error('Sync to sheet error:', error);
    await supabase
      .from('clients')
      .update({ sheet_sync_error: String(error) })
      .eq('id', client_id);
    return NextResponse.json({ error: 'Failed to sync to sheet' }, { status: 500 });
  }
}
