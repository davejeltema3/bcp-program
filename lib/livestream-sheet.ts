/**
 * Writes channel-review submissions AND registrations to the "Livestream
 * Waitlist" tab of the BCP Members Sheet. Self-contained (its own Sheets
 * client) so it never touches the member-critical logic in lib/sheets.ts.
 *
 * Layout:
 *   A Timestamp (signup / registration time)   B First Name   C Email
 *   D..K  the eight review answers (built from lib/livestream-review.ts)
 *   L Featured?   M Notes   (Dave's manual columns; code never writes them)
 *
 * Flow:
 *   - appendLivestreamRegistrant() runs on RSVP. It creates the row with the
 *     signup time (A), name, and email, or fills the signup time if the row is
 *     already there.
 *   - appendLivestreamReview() runs on submit. It fills the name + answers into
 *     B..K of the person's row, leaving the signup Timestamp (A) untouched. One
 *     row per email (a resubmission overwrites the answers).
 *   - recordLiveView() logs /live page views to the hidden "Live Views" tab so
 *     the visitor count can live in the sheet.
 */

import { reviewQuestions } from './livestream-review';

const SPREADSHEET_ID = process.env.BCP_SHEET_ID || '1lpnkxlN21slJwdItDr9Q-fzMcS5tzRz1l4fpqT8Oa6c';
const SHEET_NAME = 'Livestream Waitlist';
const VIEWS_SHEET = 'Live Views';

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

// Eastern-time stamp, no seconds: "7/22/2026, 1:04 PM".
function nowEST(): string {
  return new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
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

// First empty row by the email column (C), or the row past the end.
async function nextEmptyRow(): Promise<number> {
  const sheets = await getSheets();
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
  return nextRow;
}

/**
 * Called on RSVP. Puts the registrant in the sheet with their signup time (A)
 * so they show up before they ever submit a review. If they're already in the
 * sheet, just fills the signup time when it's missing.
 */
export async function appendLivestreamRegistrant(
  email: string,
  firstName?: string,
): Promise<void> {
  if (!email) return;
  await ensureTab();
  const sheets = await getSheets();

  const existing = await findRowByEmail(email);
  if (existing) {
    const cur = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A${existing}`,
    });
    if (!cur.data.values?.[0]?.[0]) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A${existing}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[nowEST()]] },
      });
    }
    return;
  }

  const nextRow = await nextEmptyRow();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A${nextRow}:C${nextRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[nowEST(), (firstName || '').split(' ')[0], email]] },
  });
}

/**
 * Called on submit. Fills the name + answers into B..K of the person's row and
 * leaves the signup Timestamp (A) untouched. If they somehow submitted without
 * registering, a new row is created with the submit time as the timestamp.
 */
export async function appendLivestreamReview(
  email: string,
  name: string | undefined,
  answers: Record<string, string>,
): Promise<void> {
  await ensureTab();
  const sheets = await getSheets();
  const lastCol = colLetter(headerRow().length - 1);
  const firstName = (name || '').split(' ')[0];
  const answerCells = reviewQuestions.map((q) => answers[q.id] || '');

  const existing = await findRowByEmail(email);
  if (existing) {
    // Preserve A (signup time). Fill B..K only.
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!B${existing}:${lastCol}${existing}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[firstName, email, ...answerCells]] },
    });
    return;
  }

  const nextRow = await nextEmptyRow();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A${nextRow}:${lastCol}${nextRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[nowEST(), firstName, email, ...answerCells]] },
  });
}

// --- /live view counter --------------------------------------------------
// Logs one row per page view to the hidden "Live Views" tab. The summary cell
// counts those rows, so the sheet tracks visitors without the Vercel Analytics
// query API.

async function ensureViewsTab(): Promise<void> {
  const sheets = await getSheets();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = meta.data.sheets?.some((s: any) => s.properties?.title === VIEWS_SHEET);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: VIEWS_SHEET } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${VIEWS_SHEET}'!A1:B1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Timestamp', 'Referrer']] },
    });
  }
}

/**
 * Append one /live view. Called by /api/live-view, which the page beacons once
 * per browser (localStorage-guarded). Append is atomic, so concurrent views
 * never race. Bots that don't run JavaScript never trigger it.
 */
export async function recordLiveView(referrer?: string): Promise<void> {
  await ensureViewsTab();
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${VIEWS_SHEET}'!A:B`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[nowEST(), referrer || '']] },
  });
}
