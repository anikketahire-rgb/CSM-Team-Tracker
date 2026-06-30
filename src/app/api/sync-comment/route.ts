import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { client_id, sheet_id, tab_name, apps_script_url, item_number, item_name, date_column, value } = body;

  console.log('[sync-comment] Request:', { client_id, sheet_id, tab_name, apps_script_url, item_number, item_name, date_column, value });

  if (!client_id || !sheet_id || !apps_script_url) {
    console.error('[sync-comment] Missing fields:', { client_id: !!client_id, sheet_id: !!sheet_id, apps_script_url: !!apps_script_url });
    return NextResponse.json({ error: 'Missing required fields', debug: { client_id: !!client_id, sheet_id: !!sheet_id, apps_script_url: !!apps_script_url } }, { status: 400 });
  }

  try {
    const payload = {
      action: 'writeComment',
      sheetId: sheet_id,
      tabName: tab_name || 'Implementation Tracker',
      itemNumber: item_number,
      itemName: item_name,
      dateColumn: date_column,
      value: value,
    };
    console.log('[sync-comment] Calling Apps Script:', apps_script_url, 'payload:', JSON.stringify(payload));

    const response = await fetch(apps_script_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('[sync-comment] Apps Script response status:', response.status, 'body:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('[sync-comment] Failed to parse Apps Script response:', responseText);
      return NextResponse.json({ error: 'Apps Script returned non-JSON', raw: responseText }, { status: 500 });
    }

    if (result.error) {
      console.error('[sync-comment] Apps Script error:', result.error);
      return NextResponse.json({ error: result.error, details: result }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('[sync-comment] Catch error:', error.message, error.stack);
    return NextResponse.json({ error: 'Failed to sync comment to sheet', details: error.message }, { status: 500 });
  }
}
