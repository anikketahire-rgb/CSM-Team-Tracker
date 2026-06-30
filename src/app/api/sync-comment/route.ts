import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { client_id, sheet_id, tab_name, apps_script_url, item_number, item_name, date_column, value } = body;

  if (!client_id || !sheet_id || !apps_script_url) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const response = await fetch(apps_script_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'writeComment',
        sheetId: sheet_id,
        tabName: tab_name || 'Implementation Tracker',
        itemNumber: item_number,
        itemName: item_name,
        dateColumn: date_column,
        value: value,
      }),
    });

    const result = await response.json();

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Sync comment error:', error);
    return NextResponse.json({ error: 'Failed to sync comment to sheet' }, { status: 500 });
  }
}
