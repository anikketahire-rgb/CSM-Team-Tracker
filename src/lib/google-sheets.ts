import { google } from 'googleapis';

const FIXED_HEADERS = ['#', 'Category', 'Item', 'Background/Context', 'Owner', 'Priority', 'Status', 'Start Date', 'Due Date'];

function getAuth() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not set');

  const credentials = JSON.parse(key);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
  });
  return auth;
}

function getSheets() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

function getDrive() {
  return google.drive({ version: 'v3', auth: getAuth() });
}

function columnToLetter(col: number): string {
  let letter = '';
  while (col > 0) {
    const mod = (col - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    col = Math.floor((col - mod - 1) / 26);
  }
  return letter;
}

function formatDateForDB(dateValue: unknown): string {
  if (!dateValue) return '';
  const str = String(dateValue).trim();
  if (!str) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (str.length >= 10 && str.startsWith('20')) {
    const d = str.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  }
  const months: Record<string, string> = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06', Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' };
  const match = str.match(/^(\d{1,2})\s+(\w{3})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = months[match[2]];
    if (month) return `2026-${month}-${day}`;
  }
  const parts = str.split(/[\/\-]/);
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return str;
}

export async function createSpreadsheet(clientName: string, csmName: string): Promise<{ spreadsheetId: string }> {
  const sheets = getSheets();

  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: `CSM Tracker - ${clientName}` },
      sheets: [{ properties: { title: 'Implementation Tracker' } }],
    },
  });

  const spreadsheetId = res.data.spreadsheetId!;
  const sheetId = res.data.sheets![0].properties!.sheetId!;

  const today = new Date().toISOString().slice(0, 10);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Implementation Tracker!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [
      ['CSM Implementation Tracker'],
      ['CSM:', csmName || '', '', 'Report Frequency:', 'Weekly', '', 'Last Updated:', today],
      [...FIXED_HEADERS],
    ] },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 2, endRowIndex: 3 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.91, green: 0.91, blue: 0.91 },
                textFormat: { bold: true },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
        {
          updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 3 } },
            fields: 'gridProperties.frozenRowCount',
          },
        },
      ],
    },
  });

  return { spreadsheetId };
}

export async function syncItemsToSheet(
  spreadsheetId: string,
  tabName: string,
  items: Array<{
    row_index: number;
    section: string;
    item: string;
    background: string;
    owner: string;
    priority: string;
    status: string;
    start_date: string | null;
    due_date: string | null;
  }>,
  csmName: string,
  reportFrequency: string,
): Promise<{ itemsSynced: number }> {
  const sheets = getSheets();
  const today = new Date().toISOString().slice(0, 10);

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: `${tabName}!B2`, values: [[csmName || '']] },
        { range: `${tabName}!H2`, values: [[reportFrequency || 'Weekly']] },
        { range: `${tabName}!E2`, values: [[today]] },
      ],
    },
  });

  // Read existing data to preserve date column values
  let existingRows: string[][] = [];
  let dateColCount = 0;
  try {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tabName}!A3:ZZ`,
    });
    existingRows = (existing.data.values || []) as string[][];
    const headerRow = existingRows[0] || [];
    dateColCount = Math.max(0, headerRow.length - FIXED_HEADERS.length);
  } catch {
    // Sheet might be empty
  }

  const rows: string[][] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const existingRow = existingRows[i + 1] || [];

    const baseRow = [
      String(i + 1),
      item.section || '',
      item.item,
      item.background || '',
      item.owner || '',
      item.priority || 'P2',
      item.status || 'Not Started',
      item.start_date || '',
      item.due_date || '',
    ];

    for (let c = 0; c < dateColCount; c++) {
      baseRow.push(String(existingRow[FIXED_HEADERS.length + c] || ''));
    }

    rows.push(baseRow);
  }

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${tabName}!A4:ZZ`,
  });

  if (rows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tabName}!A4`,
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    });
  }

  return { itemsSynced: items.length };
}

export async function readSheetData(
  spreadsheetId: string,
  tabName: string,
): Promise<{
  items: Array<{
    row_index: number;
    section: string;
    item: string;
    background: string;
    owner: string;
    priority: string;
    status: string;
    start_date: string;
    due_date: string;
  }>;
  dateUpdates: Array<{
    itemNumber: number;
    itemName: string;
    dateColumn: string;
    value: string;
  }>;
}> {
  const sheets = getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!A3:ZZ`,
  });

  const rows = (res.data.values || []) as string[][];
  if (rows.length < 2) return { items: [], dateUpdates: [] };

  const headerRow = rows[0];
  const dateColCount = Math.max(0, headerRow.length - FIXED_HEADERS.length);
  const items: Array<{
    row_index: number;
    section: string;
    item: string;
    background: string;
    owner: string;
    priority: string;
    status: string;
    start_date: string;
    due_date: string;
  }> = [];
  const dateUpdates: Array<{
    itemNumber: number;
    itemName: string;
    dateColumn: string;
    value: string;
  }> = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const itemName = String(row[2] || '').trim();
    if (!itemName) continue;

    const itemNum = Number(row[0]) || i;

    items.push({
      row_index: itemNum,
      section: String(row[1] || ''),
      item: itemName,
      background: String(row[3] || ''),
      owner: String(row[4] || ''),
      priority: String(row[5] || 'P2').trim(),
      status: String(row[6] || 'Not Started').trim(),
      start_date: formatDateForDB(row[7]),
      due_date: formatDateForDB(row[8]),
    });

    for (let c = 0; c < dateColCount; c++) {
      const cellValue = row[FIXED_HEADERS.length + c];
      if (cellValue && String(cellValue).trim() !== '') {
        dateUpdates.push({
          itemNumber: itemNum,
          itemName,
          dateColumn: String(headerRow[FIXED_HEADERS.length + c]).trim(),
          value: String(cellValue).trim(),
        });
      }
    }
  }

  return { items, dateUpdates };
}

export async function writeCommentToSheet(
  spreadsheetId: string,
  tabName: string,
  itemRowNumber: number,
  dateColumn: string,
  value: string,
): Promise<{ success: boolean; error?: string }> {
  const sheets = getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!A3:ZZ3`,
  });

  const headerRow = (res.data.values?.[0] || []) as string[];
  let targetCol = -1;

  for (let c = 0; c < headerRow.length; c++) {
    if (String(headerRow[c]).trim() === dateColumn) {
      targetCol = c;
      break;
    }
  }

  if (targetCol === -1) {
    targetCol = headerRow.length;
    const colLetter = columnToLetter(targetCol + 1);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tabName}!${colLetter}3`,
      valueInputOption: 'RAW',
      requestBody: { values: [[dateColumn]] },
    });
  }

  const colLetter = columnToLetter(targetCol + 1);
  const targetRow = itemRowNumber + 3;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!${colLetter}${targetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[value]] },
  });

  return { success: true };
}

export async function shareSheetWithUser(spreadsheetId: string, email: string, role: 'reader' | 'writer' = 'writer') {
  const drive = getDrive();
  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: { type: 'user', role, emailAddress: email },
    sendNotificationEmail: false,
  });
}

export function getSpreadsheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}
