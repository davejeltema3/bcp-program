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

/**
 * Livestream link clicks land in their own tab, so livestream traffic never
 * mixes with the program click log. Same row shape as Clicks.
 */
export async function appendLivestreamClick(rec: ClickRecord): Promise<void> {
  const sheets = await getSheets();
  const ts = new Date().toISOString();
  await sheets.spreadsheets.values.append({
    spreadsheetId: TRACKING_SHEET_ID,
    range: 'Livestream!A:F',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[ts, rec.code, rec.videoId, rec.referrer, rec.userAgent, rec.country]],
    },
  });
}

export interface RegistryEntry {
  code: string;
  videoId: string;
  title: string;
  destination: string;
}

/**
 * Resolve a code from the Registry tab at runtime. Lets a new tracked link work
 * the moment its row exists in the sheet, with no code push. The deployed
 * REGISTRY in lib/tracking-registry.ts stays the fast path for known codes.
 * Registry columns: A Code, B Video ID, C Title, D Published, E Link,
 * F Studio Edit, G Destination.
 */
export async function resolveFromRegistry(code: string): Promise<RegistryEntry | null> {
  const norm = code.toLowerCase().trim();
  // Program codes live in Registry; livestream codes in Livestream Registry.
  // Both tabs share the same columns, so a code resolves from whichever holds it.
  for (const range of ['Registry!A2:G', "'Livestream Registry'!A2:G"]) {
    let rows: string[][] = [];
    try {
      rows = await readRange(range);
    } catch {
      continue;
    }
    for (const r of rows) {
      if ((r[0] || '').toLowerCase().trim() === norm) {
        return {
          code: r[0] || '',
          videoId: r[1] || '',
          title: r[2] || '',
          destination: r[6] || '',
        };
      }
    }
  }
  return null;
}

/** Find a code + tracked link by video id within a registry tab. */
export async function findByVideoId(
  videoId: string,
  tab: 'Registry' | 'Livestream Registry',
): Promise<{ code: string; link: string } | null> {
  const range = tab.includes(' ') ? `'${tab}'!A2:G` : `${tab}!A2:G`;
  let rows: string[][] = [];
  try {
    rows = await readRange(range);
  } catch {
    return null;
  }
  const norm = videoId.trim();
  for (const r of rows) {
    if ((r[1] || '').trim() === norm) {
      return { code: r[0] || '', link: r[4] || '' };
    }
  }
  return null;
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
