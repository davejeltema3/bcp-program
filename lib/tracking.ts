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
      rows = await readRangeWithRetry(range);
    } catch {
      // This resolver backs the /t redirect and must stay lenient: if one tab's
      // read is still failing after retries, fall through and try the other tab
      // rather than 404 a valid link.
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
  // Deliberately NOT swallowed: readRangeWithRetry rides out transient Sheets
  // throttling and throws only on a persistent failure. Returning null on a
  // failed read (the old behavior) made a throttled lookup look like "video not
  // in registry", so the swap silently no-op'd and reported "nothing to change".
  // Now a read that truly fails surfaces as an error; null means genuinely absent.
  const rows = await readRangeWithRetry(range);
  const norm = videoId.trim();
  for (const r of rows) {
    if ((r[1] || '').trim() === norm) {
      return { code: r[0] || '', link: r[4] || '' };
    }
  }
  return null;
}

// --- Link swap + auto-registration (backs the paste-a-URL button) -----------

const ROOT = 'https://bcp.boundlesscreator.com';
// Plain (untracked) forms. /live must not match /liveXYZ; the bare root must not
// match /live, /t/xxx, /insight, etc. (any path char after the slash disqualifies it).
const LIVE_PLAIN = /https:\/\/bcp\.boundlesscreator\.com\/live(?![A-Za-z0-9/])/g;
const ROOT_PLAIN = /https:\/\/bcp\.boundlesscreator\.com\/(?![A-Za-z0-9])/g;

/** True if the text still contains a plain (untracked) /live link. */
export function hasPlainLive(s: string): boolean {
  return new RegExp(LIVE_PLAIN.source).test(s);
}
/** True if the text still contains a plain (untracked) program root link. */
export function hasPlainProgram(s: string): boolean {
  return new RegExp(ROOT_PLAIN.source).test(s);
}

/**
 * Swap plain program/live links for their tracked /t forms. Pure and idempotent:
 * a link already in /t form has no plain match, so re-running is a no-op. Live is
 * swapped before program so the program pass never touches the freshly written
 * /t/{live} link.
 */
export function swapLinks(
  before: string,
  codes: { programCode?: string | null; liveCode?: string | null },
): { after: string; liveSwapped: boolean; programSwapped: boolean } {
  let after = before;
  let liveSwapped = false;
  let programSwapped = false;
  if (codes.liveCode) {
    const out = after.replace(new RegExp(LIVE_PLAIN.source, 'g'), `${ROOT}/t/${codes.liveCode}`);
    if (out !== after) { after = out; liveSwapped = true; }
  }
  if (codes.programCode) {
    const out = after.replace(new RegExp(ROOT_PLAIN.source, 'g'), `${ROOT}/t/${codes.programCode}`);
    if (out !== after) { after = out; programSwapped = true; }
  }
  return { after, liveSwapped, programSwapped };
}

/** Every code already in use across both registry tabs, for uniqueness on mint. */
export async function readAllRegistryCodes(): Promise<Set<string>> {
  const set = new Set<string>();
  for (const range of ['Registry!A2:A', "'Livestream Registry'!A2:A"]) {
    let rows: string[][] = [];
    try {
      rows = await readRangeWithRetry(range);
    } catch {
      continue;
    }
    for (const r of rows) {
      const c = (r[0] || '').trim().toLowerCase();
      if (c) set.add(c);
    }
  }
  return set;
}

/** Mint a 5-char lowercase-alphanumeric code not already present in `existing`. */
export function mintCode(existing: Set<string>): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  for (let tries = 0; tries < 100; tries++) {
    let c = '';
    for (let i = 0; i < 5; i++) c += alphabet[Math.floor(Math.random() * alphabet.length)];
    if (!existing.has(c)) return c;
  }
  throw new Error('could not mint a unique code');
}

export interface NewRegistryRow {
  code: string;
  videoId: string;
  title: string;
  published: string;   // YYYY-MM-DD
  destination: string; // program root or /live
  createdDate: string; // YYYY-MM-DD
  activatedIso?: string; // full ISO, program tab only (col I)
}

/**
 * Append a registry row matching the existing schema. Column F is a HYPERLINK
 * formula to the video's Studio edit page (USER_ENTERED so the formula sticks).
 * Program rows carry Created + Activated (A:I); livestream rows carry Created (A:H).
 */
export async function appendRegistryRow(
  tab: 'Registry' | 'Livestream Registry',
  row: NewRegistryRow,
): Promise<void> {
  const sheets = await getSheets();
  const studio = `=HYPERLINK("https://studio.youtube.com/video/${row.videoId}/edit","Edit description")`;
  const link = `${ROOT}/t/${row.code}`;
  const base = [row.code, row.videoId, row.title, row.published, link, studio, row.destination, row.createdDate];
  const values = tab === 'Registry' ? [...base, row.activatedIso || ''] : base;
  const range = tab === 'Registry' ? 'Registry!A:I' : "'Livestream Registry'!A:H";
  await sheets.spreadsheets.values.append({
    spreadsheetId: TRACKING_SHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
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

/**
 * readRange with retry + jittered backoff. The Sheets API enforces a per-minute
 * read quota; under a burst it returns 429/500/503 and a bare read throws. That
 * throttling is exactly what made the description sweep miss videos: a throttled
 * lookup was read as "not found" and the swap was skipped. Retrying clears the
 * transient throttle; a genuinely persistent failure still throws so the caller
 * surfaces a real error instead of a false "nothing to change".
 */
export async function readRangeWithRetry(range: string, attempts = 4): Promise<string[][]> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await readRange(range);
    } catch (err: any) {
      lastErr = err;
      if (i < attempts - 1) {
        const backoff = 300 * Math.pow(2, i) + Math.floor(Math.random() * 250);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }
  throw lastErr;
}
