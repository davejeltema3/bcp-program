/**
 * Writes channel-review submissions AND registrations to the "Livestream
 * Waitlist" tab of the BCP Members Sheet. Self-contained (its own Sheets
 * client) so it never touches the member-critical logic in lib/sheets.ts.
 *
 * Layout:
 *   A Timestamp (signup / registration time)   B First Name   C Email
 *   D..K  the eight review answers (built from lib/livestream-review.ts)
 *   L Featured?   M Notes   N Source
 * L and M are Dave's manual columns. N (Source) is the bt_src code from the
 * tracking redirect, so a signup carries which video or link it came from.
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

// Source lives two columns past the review block (after Featured? and Notes).
const SOURCE_COL = colLetter(headerRow().length + 2); // 'N' with 8 questions

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

async function ensureSourceHeader(): Promise<void> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!${SOURCE_COL}1`,
  });
  if (res.data.values?.[0]?.[0] !== 'Source') {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!${SOURCE_COL}1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Source']] },
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
 * and source (N), or fills those in if the row already exists and they're blank.
 */
export async function appendLivestreamRegistrant(
  email: string,
  firstName?: string,
  source?: string,
): Promise<void> {
  if (!email) return;
  await ensureTab();
  await ensureSourceHeader();
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
    if (source) {
      const curSrc = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!${SOURCE_COL}${existing}`,
      });
      if (!curSrc.data.values?.[0]?.[0]) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${SHEET_NAME}'!${SOURCE_COL}${existing}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[source]] },
        });
      }
    }
    return;
  }

  // New row A..N: timestamp, name, email, blank review cols, blank Featured/Notes, source.
  const middle = new Array(reviewQuestions.length + 2).fill(''); // D..M
  const row = [nowEST(), (firstName || '').split(' ')[0], email, ...middle, source || ''];
  const nextRow = await nextEmptyRow();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A${nextRow}:${SOURCE_COL}${nextRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

/**
 * Called on submit. Fills the name + answers into B..K of the person's row and
 * leaves the signup Timestamp (A), Featured/Notes, and Source untouched.
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
      range: `'${VIEWS_SHEET}'!A1:C1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Timestamp', 'Referrer', 'Source']] },
    });
  }
}

/**
 * Append one /live view. Called by /api/live-view, which the page beacons once
 * per browser (localStorage-guarded). Append is atomic, so concurrent views
 * never race. Bots that don't run JavaScript never trigger it.
 */
export async function recordLiveView(referrer?: string, source?: string): Promise<void> {
  await ensureViewsTab();
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${VIEWS_SHEET}'!A:C`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[nowEST(), referrer || '', source || '']] },
  });
}
