import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeCommentToSheet } from '@/lib/google-sheets';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { client_id, sheet_id, tab_name, item_row_number, date_column, value } = body;

  if (!client_id || !sheet_id || item_row_number === undefined || !date_column) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const result = await writeCommentToSheet(
      sheet_id,
      tab_name || 'Implementation Tracker',
      item_row_number,
      date_column,
      value || '',
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Sync comment error:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync comment to sheet' }, { status: 500 });
  }
}
