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

// --- Promo-block normalization (backs the paste-a-URL button) ----------------

const ROOT = 'https://bcp.boundlesscreator.com';
const LIVE_LABEL = 'Join me live on Aug 13th';
const PROGRAM_LABEL = 'Work With Me';

/**
 * Rewrite a description so its top is exactly the two promo lines, in canonical
 * order (live, then program), each pointing at its tracked /t link, with one
 * blank line before the rest of the description.
 *
 * Any prior version of either line is removed first (plain OR tracked, wherever
 * it sat, whatever its label), then the canonical pair is prepended. So this
 * REPLACES a link that's there and ADDS one that isn't, can't leave a stray
 * duplicate, and fixes a reordered or mislabeled line. Lines are matched by the
 * URL they carry, not their label. A null code leaves that line untouched.
 *
 * Idempotent: a description already in canonical form maps to itself.
 */
export function normalizePromo(
  before: string,
  codes: { liveCode?: string | null; programCode?: string | null },
): string {
  const { liveCode, programCode } = codes;

  // Identify an existing promo line by the URL it carries (any form).
  //   live: plain /live (not /liveXYZ) or the tracked live code
  //   program: the bare root (no path after the slash) or the tracked program code
  // /insight, /submit, /live and /t/{othercode} are NOT the bare program root.
  const liveRe = liveCode
    ? new RegExp(`bcp\\.boundlesscreator\\.com/(live(?![A-Za-z0-9/])|t/${liveCode}(?![A-Za-z0-9]))`, 'i')
    : null;
  const progRe = programCode
    ? new RegExp(`bcp\\.boundlesscreator\\.com/(t/${programCode}(?![A-Za-z0-9])|(?![A-Za-z0-9]))`, 'i')
    : null;

  const kept = before.split('\n').filter((line) => {
    if (liveRe && liveRe.test(line)) return false;
    if (progRe && progRe.test(line)) return false;
    return true;
  });
  while (kept.length && kept[0].trim() === '') kept.shift();

  const promo: string[] = [];
  if (liveCode) promo.push(`${LIVE_LABEL}: ${ROOT}/t/${liveCode}`);
  if (programCode) promo.push(`${PROGRAM_LABEL}: ${ROOT}/t/${programCode}`);

  const rest = kept.join('\n').replace(/^\n+/, '');
  return rest.trim().length ? `${promo.join('\n')}\n\n${rest}` : promo.join('\n');
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
  activatedIso?: string; // full ISO, col I — when the link went live (for the burst filter)
}

/**
 * Append a registry row matching the existing schema. Column F is a HYPERLINK
 * formula to the video's Studio edit page (USER_ENTERED so the formula sticks).
 * Both tabs carry Created (H) + Activated (I). Activated is stamped when the link
 * is written into a description, and the dashboard ignores clicks for a short
 * window after it so the publish-time crawler burst never counts.
 */
export async function appendRegistryRow(
  tab: 'Registry' | 'Livestream Registry',
  row: NewRegistryRow,
): Promise<void> {
  const sheets = await getSheets();
  const studio = `=HYPERLINK("https://studio.youtube.com/video/${row.videoId}/edit","Edit description")`;
  const link = `${ROOT}/t/${row.code}`;
  const base = [row.code, row.videoId, row.title, row.published, link, studio, row.destination, row.createdDate];
  const values = [...base, row.activatedIso || ''];
  const range = tab === 'Registry' ? 'Registry!A:I' : "'Livestream Registry'!A:I";
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

/** The BCP Members spreadsheet (holds the Livestream Waitlist signups). */
export const MEMBERS_SHEET_ID =
  process.env.MEMBERS_SHEET_ID || '1lpnkxlN21slJwdItDr9Q-fzMcS5tzRz1l4fpqT8Oa6c';

/** Read a range from any spreadsheet the service account can see (e.g. Members). */
export async function readRangeFrom(spreadsheetId: string, range: string): Promise<string[][]> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
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
