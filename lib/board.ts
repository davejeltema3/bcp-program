/**
 * The Board — read/write for Dave's personal dashboard.
 *
 * Stored as a "Board" tab in the Boundless Tracking spreadsheet, using the same
 * service-account auth as lib/tracking.ts. Never touches the Members Sheet.
 *
 * Sheet columns (A-H): id | section | group | text | checked | tag | order | kind
 *   section: meta | northstar | goals | needs-you | today | soon | horizon | parked | notification
 *   checked: "TRUE" / "FALSE" for `item` rows, blank otherwise
 *   group:   subheading (soon), date label (horizon), or meta key (meta rows)
 *   order:   sort within a section; also carries the epoch ts for notification rows
 */

const BOARD_SHEET_ID =
  process.env.BT_SHEET_ID || '1RjmL9UBCYnxMBdlmzhDwbR1wbOfnGcmUabDTP-CgYHI';
const TAB = 'Board';

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

export interface BoardItem {
  id: string;
  text: string;
  checked: boolean;
  tag: string;
  kind: string;
}
export interface SoonGroup {
  group: string;
  items: BoardItem[];
}
export interface HorizonRow {
  date: string;
  text: string;
}
export interface BoardNotification {
  id: string;
  date: string;
  text: string;
  tag: string;
  ts: number;
}
export interface BoardData {
  updated: string;
  notifLastSeen: number;
  northstar: string;
  goals: BoardItem[];
  needsYou: BoardItem[];
  today: BoardItem[];
  soon: SoonGroup[];
  horizon: HorizonRow[];
  parked: string[];
  notifications: BoardNotification[];
}

function truthy(v: string | undefined): boolean {
  return String(v || '').trim().toUpperCase() === 'TRUE';
}

async function readRows(): Promise<string[][]> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: BOARD_SHEET_ID,
    range: `${TAB}!A2:H`,
  });
  return (res.data.values as string[][]) || [];
}

export async function getBoard(): Promise<BoardData> {
  const rows = await readRows();
  const g = (r: string[], i: number) => (r[i] || '').toString();

  const meta: Record<string, string> = {};
  const goals: BoardItem[] = [];
  const needsYou: BoardItem[] = [];
  const today: BoardItem[] = [];
  const soonMap: Record<string, BoardItem[]> = {};
  const soonOrder: string[] = [];
  const horizon: HorizonRow[] = [];
  const parked: string[] = [];
  const notifications: BoardNotification[] = [];
  let northstar = '';

  for (const r of rows) {
    const id = g(r, 0);
    const section = g(r, 1);
    const group = g(r, 2);
    const text = g(r, 3);
    const checked = truthy(g(r, 4));
    const tag = g(r, 5);
    const order = g(r, 6);
    const kind = g(r, 7);
    if (!id) continue;
    const item: BoardItem = { id, text, checked, tag, kind };

    switch (section) {
      case 'meta':
        meta[group || id] = text || order;
        break;
      case 'northstar':
        northstar = text;
        break;
      case 'goals':
        goals.push(item);
        break;
      case 'needs-you':
        needsYou.push(item);
        break;
      case 'today':
        today.push(item);
        break;
      case 'soon':
        if (!soonMap[group]) {
          soonMap[group] = [];
          soonOrder.push(group);
        }
        soonMap[group].push(item);
        break;
      case 'horizon':
        horizon.push({ date: group, text });
        break;
      case 'parked':
        parked.push(text);
        break;
      case 'notification':
        notifications.push({ id, date: group, text, tag, ts: parseInt(order) || 0 });
        break;
    }
  }

  notifications.sort((a, b) => b.ts - a.ts);
  const soon: SoonGroup[] = soonOrder.map((grp) => ({ group: grp, items: soonMap[grp] }));

  return {
    updated: meta['meta_updated'] || '',
    notifLastSeen: parseInt(meta['notif_last_seen'] || '0') || 0,
    northstar,
    goals,
    needsYou,
    today,
    soon,
    horizon,
    parked,
    notifications,
  };
}

async function findRowById(id: string): Promise<number | null> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: BOARD_SHEET_ID,
    range: `${TAB}!A:A`,
  });
  const rows = res.data.values || [];
  for (let i = 0; i < rows.length; i++) {
    if ((rows[i]?.[0] || '') === id) return i + 1; // 1-based row number
  }
  return null;
}

/** Flip an item's checked state. Returns false if the id was not found. */
export async function setChecked(id: string, checked: boolean): Promise<boolean> {
  const rowNum = await findRowById(id);
  if (!rowNum) return false;
  const sheets = await getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: BOARD_SHEET_ID,
    range: `${TAB}!E${rowNum}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[checked ? 'TRUE' : 'FALSE']] },
  });
  return true;
}

/** Mark all notifications seen by stamping the meta_notif_seen row with now (epoch seconds). */
export async function markNotificationsSeen(): Promise<number> {
  const now = Math.floor(Date.now() / 1000);
  const rowNum = await findRowById('meta_notif_seen');
  if (!rowNum) return now;
  const sheets = await getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: BOARD_SHEET_ID,
    range: `${TAB}!D${rowNum}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[String(now)]] },
  });
  return now;
}
