import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { client_id, client_name, csm_name, apps_script_url } = body;

  if (!client_id || !client_name) {
    return NextResponse.json({ error: 'Missing client_id or client_name' }, { status: 400 });
  }

  if (!apps_script_url) {
    return NextResponse.json({ error: 'No Apps Script URL configured for this client. Add it in client Settings tab.' }, { status: 400 });
  }

  try {
    const response = await fetch(apps_script_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'createSheet',
        clientName: client_name,
        csmName: csm_name,
      }),
    });

    const result = await response.json();

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('clients')
      .update({
        sheet_id: result.sheetId,
        tab_name: result.tabName || 'Implementation Tracker',
        sheet_last_synced_at: new Date().toISOString(),
      })
      .eq('id', client_id);

    if (updateError) {
      console.error('Failed to update client sheet info:', updateError);
    }

    return NextResponse.json({ success: true, sheetId: result.sheetId });
  } catch (error) {
    console.error('Create sheet error:', error);
    return NextResponse.json({ error: 'Failed to create sheet. Check your Apps Script URL.' }, { status: 500 });
  }
}
