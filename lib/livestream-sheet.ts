/**
 * Writes channel-review submissions to the "Livestream Reviews" tab of the
 * BCP Members Sheet. Self-contained (its own Sheets client) so it never
 * touches the member-critical logic in lib/sheets.ts.
 *
 * The tab and its header row are created on first write. Columns are built
 * from lib/livestream-review.ts, so changing the questions there changes the
 * sheet layout too. One row per email (a resubmission overwrites).
 */

import { reviewQuestions } from './livestream-review';

const SPREADSHEET_ID = process.env.BCP_SHEET_ID || '1lpnkxlN21slJwdItDr9Q-fzMcS5tzRz1l4fpqT8Oa6c';
const SHEET_NAME = 'Livestream Reviews';

async function getSheets() {
  const { google } = await import('googleapis');
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
    : undefined;
  const auth = credentials
    ? new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
    : new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
  return google.sheets({ version: 'v4', auth });
}

function nowEST(): string {
  return new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
}

function colLetter(n: number): string {
  let s = '';
  n += 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function headerRow(): string[] {
  return ['Timestamp', 'First Name', 'Email', ...reviewQuestions.map((q) => q.column)];
}

async function ensureTab(): Promise<void> {
  const sheets = await getSheets();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = meta.data.sheets?.some((s: any) => s.properties?.title === SHEET_NAME);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] },
    });
  }
  const h = headerRow();
  const lastCol = colLetter(h.length - 1);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A1:${lastCol}1`,
  });
  const existing = res.data.values?.[0] || [];
  if (existing[0] !== 'Timestamp') {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A1:${lastCol}1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [h] },
    });
  }
}

async function findRowByEmail(email: string): Promise<number | null> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!C:C`,
  });
  const rows = res.data.values || [];
  const norm = email.toLowerCase().trim();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i]?.[0]?.toLowerCase().trim() === norm) return i + 1;
  }
  return null;
}

/**
 * Append (or overwrite by email) a channel-review submission.
 */
export async function appendLivestreamReview(
  email: string,
  name: string | undefined,
  answers: Record<string, string>,
): Promise<void> {
  await ensureTab();
  const sheets = await getSheets();
  const h = headerRow();
  const lastCol = colLetter(h.length - 1);
  const firstName = (name || '').split(' ')[0];
  const row = [nowEST(), firstName, email, ...reviewQuestions.map((q) => answers[q.id] || '')];

  const existing = await findRowByEmail(email);
  if (existing) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A${existing}:${lastCol}${existing}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
    return;
  }

  // Find the first empty row by scanning the email column (C).
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!C:C`,
  });
  const emailCol = res.data.values || [];
  let nextRow = emailCol.length + 1;
  for (let i = 1; i < emailCol.length; i++) {
    if (!emailCol[i] || !emailCol[i][0] || emailCol[i][0].trim() === '') {
      nextRow = i + 1;
      break;
    }
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A${nextRow}:${lastCol}${nextRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}
