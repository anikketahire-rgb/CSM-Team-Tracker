import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSpreadsheet } from '@/lib/google-sheets';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { client_id, client_name, csm_name } = body;

  if (!client_id || !client_name) {
    return NextResponse.json({ error: 'Missing client_id or client_name' }, { status: 400 });
  }

  try {
    const { spreadsheetId } = await createSpreadsheet(client_name, csm_name);

    const { error: updateError } = await supabase
      .from('clients')
      .update({
        sheet_id: spreadsheetId,
        tab_name: 'Implementation Tracker',
        sheet_last_synced_at: new Date().toISOString(),
      })
      .eq('id', client_id);

    if (updateError) {
      console.error('Failed to update client sheet info:', updateError);
    }

    return NextResponse.json({ success: true, sheetId: spreadsheetId });
  } catch (error: any) {
    console.error('Create sheet error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create sheet' }, { status: 500 });
  }
}
