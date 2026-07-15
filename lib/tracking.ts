/**
 * Boundless Tracking — reads and writes for the dedicated tracking Sheet.
 *
 * Mirrors the service-account auth in lib/sheets.ts (GOOGLE_SERVICE_ACCOUNT_JSON).
 * Targets the Boundless Tracking spreadsheet, NOT the Members Sheet, so member
 * data is never touched by tracking writes.
 */

const TRACKING_SHEET_ID =
  process.env.BT_SHEET_ID || '1RjmL9UBCYnxMBdlmzhDwbR1wbOfnGcmUabDTP-CgYHI';

async function getSheets() {
  const { google } = await import('googleapis');

  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
    : undefined;

  const auth = credentials
    ? new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      })
    : new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

  return google.sheets({ version: 'v4', auth });
}

export interface ClickRecord {
  code: string;
  videoId: string;
  referrer: string;
  userAgent: string;
  country: string;
}

export async function appendClick(rec: ClickRecord): Promise<void> {
  const sheets = await getSheets();
  const ts = new Date().toISOString();
  await sheets.spreadsheets.values.append({
    spreadsheetId: TRACKING_SHEET_ID,
    range: 'Clicks!A:F',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[ts, rec.code, rec.videoId, rec.referrer, rec.userAgent, rec.country]],
    },
  });
}

export interface SaleRecord {
  email: string;
  code: string;
  videoId: string;
  amount: string;
  mode: string;
  session: string;
}

export async function appendSale(rec: SaleRecord): Promise<void> {
  const sheets = await getSheets();
  const ts = new Date().toISOString();
  await sheets.spreadsheets.values.append({
    spreadsheetId: TRACKING_SHEET_ID,
    range: 'Sales!A:G',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[ts, rec.email, rec.code, rec.videoId, rec.amount, rec.mode, rec.session]],
    },
  });
}

export async function readRange(range: string): Promise<string[][]> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: TRACKING_SHEET_ID,
    range,
  });
  return (res.data.values as string[][]) || [];
}
