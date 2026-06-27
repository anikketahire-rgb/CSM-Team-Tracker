import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || '';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { client_id, client_name, csm_name } = body;

  if (!client_id || !client_name) {
    return NextResponse.json({ error: 'Missing client_id or client_name' }, { status: 400 });
  }

  if (!APPS_SCRIPT_URL) {
    return NextResponse.json({ error: 'APPS_SCRIPT_URL not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
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

    // Update client with sheet info
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
    return NextResponse.json({ error: 'Failed to create sheet' }, { status: 500 });
  }
}
