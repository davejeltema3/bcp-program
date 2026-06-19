/**
 * Google Sheets API integration for the BCP member management sheet.
 *
 * Sheet: "Form Responses 1" in spreadsheet 1lpnkxlN21slJwdItDr9Q-fzMcS5tzRz1l4fpqT8Oa6c
 *
 * COLUMNS A-Z: Questionnaire data (original form columns)
 *   A: Timestamp
 *   B: First Name            C: Email                D: Channel URL
 *   E: Questionnaire Submitted?
 *   F-Q: AI-derived fields (filled post-submission)
 *   R: Monetized?            S: AI Comfort           T: Hours per Week
 *   U: Best Video Theory     V: Hasn't worked?       W: Content Goals
 *   X: Program Goals         Y: Challenge            Z: Analytics Access
 *   AA: Anything Else?       AB: AI Evaluation
 *
 * COLUMNS AC-AP: Member management (auto-filled by webhook, manually editable)
 *   AC: Start Date           — Auto-set at payment. Edit to override.
 *   AD: End Date             — Start + 180 days default. Edit to extend/shorten.
 *   AE: Status               — Formula: auto-calculates from End Date, or manual override.
 *   AF: Days Remaining       — Formula: MAX(0, End Date - TODAY())
 *   AG: Payment Type         — one-time / installment / comp
 *   AH: Amount Paid          — Dollar amount from Stripe
 *   AI: Total Revenue        — Cumulative (increments on renewal)
 *   AJ: Stripe Customer ID   — For Stripe dashboard lookups
 *   AK: Stripe Session ID    — Link to specific payment
 *   AL: Discord Invite URL   — Generated at payment time
 *   AM: Discord User ID      — Manual entry (for auto-removal later)
 *   AN: Renewal Count        — How many times they've joined/renewed
 *   AO: Cancelled Date       — When they left (manual or auto)
 *   AP: Notes                — Free-form notes per member
 */

const SPREADSHEET_ID = process.env.BCP_SHEET_ID || '1lpnkxlN21slJwdItDr9Q-fzMcS5tzRz1l4fpqT8Oa6c';
const SHEET_NAME = 'Form Responses 1';
const WAITLIST_SHEET_NAME = 'Waitlist';
const TOTAL_COLS = 42; // A through AP
const RANGE_ALL = `'${SHEET_NAME}'!A:AP`;

// Column indices (0-based)
const COL = {
  // Questionnaire columns (A-AB)
  TIMESTAMP: 0,         // A
  FIRST_NAME: 1,        // B
  EMAIL: 2,             // C
  CHANNEL_URL: 3,       // D
  QUESTIONNAIRE_SUB: 4, // E
  ACTIVE_CREATOR: 5,    // F
  DURATION: 6,          // G
  SUBSCRIBERS: 7,       // H
  TOTAL_VIDEOS: 8,      // I
  CHANNEL_AGE: 9,       // J
  UPLOAD_CADENCE: 10,   // K
  CONTENT_TYPE: 11,     // L
  TARGET_AUDIENCE: 12,  // M
  TOP_VIDEOS: 13,       // N
  BOTTOM_VIDEOS: 14,    // O
  AVG_VIEWS_30D: 15,    // P
  SHORTS_EVAL: 16,      // Q
  MONETIZED: 17,        // R
  AI_COMFORT: 18,       // S
  HOURS_PER_WEEK: 19,   // T
  BEST_VIDEO_THEORY: 20,// U
  WHAT_DIDNT_WORK: 21,  // V
  CONTENT_GOALS: 22,    // W
  PROGRAM_GOALS: 23,    // X
  CHALLENGE: 24,        // Y
  ANALYTICS_ACCESS: 25, // Z
  ANYTHING_ELSE: 26,    // AA
  AI_EVALUATION: 27,    // AB

  // Member management columns (AC-AP)
  START_DATE: 28,       // AC
  END_DATE: 29,         // AD
  STATUS: 30,           // AE
  DAYS_REMAINING: 31,   // AF
  PAYMENT_TYPE: 32,     // AG
  AMOUNT_PAID: 33,      // AH
  TOTAL_REVENUE: 34,    // AI
  STRIPE_CUSTOMER: 35,  // AJ
  STRIPE_SESSION: 36,   // AK
  DISCORD_INVITE: 37,   // AL
  DISCORD_USER_ID: 38,  // AM
  RENEWAL_COUNT: 39,    // AN
  CANCELLED_DATE: 40,   // AO
  NOTES: 41,            // AP
} as const;

// Headers for the management columns (AC-AP)
const MGMT_HEADERS = [
  'Start Date',
  'End Date',
  'Status',
  'Days Remaining',
  'Payment Type',
  'Amount Paid',
  'Total Revenue',
  'Stripe Customer ID',
  'Stripe Session ID',
  'Discord Invite URL',
  'Discord User ID',
  'Renewal Count',
  'Cancelled Date',
  'Notes',
];

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

function todayEST(): string {
  return new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
}

function endDateFromStart(startDate: string, days: number = 180): string {
  const d = new Date(startDate);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-US', { timeZone: 'America/New_York' });
}

/**
 * Find a row by email. Returns the 1-based row number or null.
 */
async function findRowByEmail(email: string): Promise<number | null> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!C:C`,
  });

  const rows = res.data.values || [];
  const normalizedEmail = email.toLowerCase().trim();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i]?.[0]?.toLowerCase().trim() === normalizedEmail) {
      return i + 1;
    }
  }
  return null;
}

/**
 * Get the full row data for a given row number.
 */
async function getRowData(rowNum: number): Promise<string[]> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A${rowNum}:AP${rowNum}`,
  });
  const values = res.data.values?.[0] || [];
  // Pad to full width
  while (values.length < TOTAL_COLS) values.push('');
  return values;
}

/**
 * Write a full row back to the sheet.
 */
async function writeRow(rowNum: number, row: string[]): Promise<void> {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A${rowNum}:AP${rowNum}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

/**
 * Append a new row to the sheet.
 * Uses explicit row targeting instead of the append API to avoid issues
 * with pre-formatted empty rows pushing data to the wrong position.
 */
async function appendRow(row: string[]): Promise<number> {
  const sheets = await getSheets();

  // Find the actual next empty row by scanning the email column (C)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!C:C`,
  });
  const emailCol = res.data.values || [];

  // Find first empty row after header (row 1). Start at index 1 (row 2).
  let nextRow = emailCol.length + 1; // default: after all existing rows
  for (let i = 1; i < emailCol.length; i++) {
    if (!emailCol[i] || !emailCol[i][0] || emailCol[i][0].trim() === '') {
      nextRow = i + 1; // 1-based row number
      break;
    }
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A${nextRow}:AP${nextRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });

  return nextRow;
}

/**
 * Build the Status formula for a given row.
 * Logic: If AE (Status) has been manually overridden (not a formula result),
 * keep the manual value. Otherwise auto-calculate from End Date.
 *
 * Since we can't detect "manual vs formula" easily, we use a simpler approach:
 * just set it as a formula. If Dave types over it, his value sticks.
 */
function statusFormula(rowNum: number): string {
  // AD = End Date column
  return `=IF(AD${rowNum}="","—",IF(TODAY()>AD${rowNum},"Expired","Active"))`;
}

/**
 * Build the Days Remaining formula for a given row.
 */
function daysRemainingFormula(rowNum: number): string {
  return `=IF(AD${rowNum}="","—",MAX(0,AD${rowNum}-TODAY()))`;
}

// ─── Public API ───

/**
 * Ensure the management column headers exist.
 */
export async function ensureHeaders(): Promise<void> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!AC1:AP1`,
  });
  const existing = res.data.values?.[0] || [];
  if (existing.length >= MGMT_HEADERS.length && existing[0] === MGMT_HEADERS[0]) {
    return; // Headers already set
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!AC1:AP1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [MGMT_HEADERS] },
  });
}

/**
 * Create or update a member row when they pay.
 * If they're a returning member, updates their existing row.
 */
export async function createPaymentRow(
  name: string,
  email: string,
  opts: {
    paymentType?: string;
    amountPaid?: number;
    stripeCustomerId?: string;
    stripeSessionId?: string;
    discordInviteUrl?: string;
  } = {},
): Promise<void> {
  const existingRowNum = await findRowByEmail(email);
  const startDate = todayEST();
  const endDate = endDateFromStart(startDate, 180);

  if (existingRowNum) {
    // Returning member — update existing row
    const row = await getRowData(existingRowNum);

    // Update timestamp
    row[COL.TIMESTAMP] = nowEST();

    // Update management columns
    row[COL.START_DATE] = startDate;
    row[COL.END_DATE] = endDate;
    row[COL.STATUS] = statusFormula(existingRowNum);
    row[COL.DAYS_REMAINING] = daysRemainingFormula(existingRowNum);
    row[COL.PAYMENT_TYPE] = opts.paymentType || 'one-time';
    row[COL.AMOUNT_PAID] = opts.amountPaid ? `${opts.amountPaid}` : '';
    row[COL.CANCELLED_DATE] = ''; // Clear cancelled date on rejoin

    // Increment total revenue
    const prevRevenue = parseFloat(row[COL.TOTAL_REVENUE]) || 0;
    const newAmount = opts.amountPaid || 0;
    row[COL.TOTAL_REVENUE] = `${prevRevenue + newAmount}`;

    // Increment renewal count
    const prevRenewals = parseInt(row[COL.RENEWAL_COUNT]) || 0;
    row[COL.RENEWAL_COUNT] = `${prevRenewals + 1}`;

    // Update Stripe IDs
    if (opts.stripeCustomerId) row[COL.STRIPE_CUSTOMER] = opts.stripeCustomerId;
    if (opts.stripeSessionId) row[COL.STRIPE_SESSION] = opts.stripeSessionId;
    if (opts.discordInviteUrl) row[COL.DISCORD_INVITE] = opts.discordInviteUrl;

    await writeRow(existingRowNum, row);
    console.log(`Updated existing row ${existingRowNum} for returning member ${email}`);
  } else {
    // New member — create row
    const row = new Array(TOTAL_COLS).fill('');
    row[COL.TIMESTAMP] = nowEST();
    row[COL.FIRST_NAME] = name.split(' ')[0];
    row[COL.EMAIL] = email;
    row[COL.QUESTIONNAIRE_SUB] = 'No';

    row[COL.START_DATE] = startDate;
    row[COL.END_DATE] = endDate;
    // Can't use formulas in append (don't know row number yet),
    // so set initial values directly
    row[COL.STATUS] = 'Active';
    row[COL.DAYS_REMAINING] = '180';
    row[COL.PAYMENT_TYPE] = opts.paymentType || 'one-time';
    row[COL.AMOUNT_PAID] = opts.amountPaid ? `${opts.amountPaid}` : '';
    row[COL.TOTAL_REVENUE] = opts.amountPaid ? `${opts.amountPaid}` : '';
    row[COL.RENEWAL_COUNT] = '1';

    if (opts.stripeCustomerId) row[COL.STRIPE_CUSTOMER] = opts.stripeCustomerId;
    if (opts.stripeSessionId) row[COL.STRIPE_SESSION] = opts.stripeSessionId;
    if (opts.discordInviteUrl) row[COL.DISCORD_INVITE] = opts.discordInviteUrl;

    const newRowNum = await appendRow(row);

    // Set formulas for the row we just created
    const sheets = await getSheets();
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!AE${newRowNum}:AF${newRowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[statusFormula(newRowNum), daysRemainingFormula(newRowNum)]] },
    });

    console.log(`Created new row ${newRowNum} for ${email}`);
  }
}

/**
 * Add a comp/manual member (no Stripe payment).
 * Used from the admin page.
 */
export async function addCompMember(
  name: string,
  email: string,
  durationDays: number = 180,
): Promise<{ isNew: boolean }> {
  const existingRowNum = await findRowByEmail(email);
  const startDate = todayEST();
  const endDate = endDateFromStart(startDate, durationDays);

  if (existingRowNum) {
    const row = await getRowData(existingRowNum);

    row[COL.TIMESTAMP] = nowEST();
    if (name) row[COL.FIRST_NAME] = name.split(' ')[0];
    row[COL.START_DATE] = startDate;
    row[COL.END_DATE] = endDate;
    row[COL.STATUS] = statusFormula(existingRowNum);
    row[COL.DAYS_REMAINING] = daysRemainingFormula(existingRowNum);
    row[COL.PAYMENT_TYPE] = 'comp';
    row[COL.CANCELLED_DATE] = '';

    const prevRenewals = parseInt(row[COL.RENEWAL_COUNT]) || 0;
    row[COL.RENEWAL_COUNT] = `${prevRenewals + 1}`;

    await writeRow(existingRowNum, row);
    return { isNew: false };
  } else {
    const row = new Array(TOTAL_COLS).fill('');
    row[COL.TIMESTAMP] = nowEST();
    row[COL.FIRST_NAME] = name.split(' ')[0];
    row[COL.EMAIL] = email;
    row[COL.QUESTIONNAIRE_SUB] = 'No';
    row[COL.START_DATE] = startDate;
    row[COL.END_DATE] = endDate;
    row[COL.STATUS] = 'Active';
    row[COL.DAYS_REMAINING] = `${durationDays}`;
    row[COL.PAYMENT_TYPE] = 'comp';
    row[COL.AMOUNT_PAID] = '0';
    row[COL.TOTAL_REVENUE] = '0';
    row[COL.RENEWAL_COUNT] = '1';

    const newRowNum = await appendRow(row);

    const sheets = await getSheets();
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!AE${newRowNum}:AF${newRowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[statusFormula(newRowNum), daysRemainingFormula(newRowNum)]] },
    });

    return { isNew: true };
  }
}

// ─── Waitlist tab ───────────────────────────────────────────────────────
//
// Lives in the same spreadsheet as members, in a separate tab named "Waitlist".
// Columns:
//   A: Timestamp        B: First Name        C: Email
//   D: Source           E: Challenge         F: Notes
//
// Source = 'before' | 'after' | 'invite' | 'migrated' (for old data brought over).

const WAITLIST_HEADERS = ['Timestamp', 'First Name', 'Email', 'Source', 'Challenge', 'Notes'];

async function findWaitlistRowByEmail(email: string): Promise<number | null> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${WAITLIST_SHEET_NAME}'!C:C`,
  });
  const rows = res.data.values || [];
  const normalizedEmail = email.toLowerCase().trim();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i]?.[0]?.toLowerCase().trim() === normalizedEmail) {
      return i + 1;
    }
  }
  return null;
}

async function ensureWaitlistTabAndHeaders(): Promise<void> {
  const sheets = await getSheets();

  // Check if the tab exists
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetExists = meta.data.sheets?.some(
    (s) => s.properties?.title === WAITLIST_SHEET_NAME,
  );

  if (!sheetExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          { addSheet: { properties: { title: WAITLIST_SHEET_NAME } } },
        ],
      },
    });
  }

  // Ensure headers
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${WAITLIST_SHEET_NAME}'!A1:F1`,
  });
  const existing = headerRes.data.values?.[0] || [];
  if (existing[0] !== WAITLIST_HEADERS[0]) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${WAITLIST_SHEET_NAME}'!A1:F1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [WAITLIST_HEADERS] },
    });
  }
}

/**
 * Append a row to the Waitlist tab using explicit row targeting instead of
 * the append API. Mirrors the same fix used for the membership tab — protects
 * against pre-formatted empty rows pushing data to the wrong position.
 *
 * Returns the 1-based row number that was written to.
 */
async function appendWaitlistRow(row: string[]): Promise<number> {
  const sheets = await getSheets();

  // Find the actual next empty row by scanning the email column (C).
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${WAITLIST_SHEET_NAME}'!C:C`,
  });
  const emailCol = res.data.values || [];

  let nextRow = emailCol.length + 1; // default: after all existing rows
  for (let i = 1; i < emailCol.length; i++) {
    if (!emailCol[i] || !emailCol[i][0] || emailCol[i][0].trim() === '') {
      nextRow = i + 1;
      break;
    }
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${WAITLIST_SHEET_NAME}'!A${nextRow}:F${nextRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });

  return nextRow;
}

/**
 * Append a new waitlist entry. If the email already exists, updates the
 * timestamp and name instead of creating a duplicate.
 */
export async function appendWaitlistEntry(
  name: string,
  email: string,
  source: string = 'before',
): Promise<void> {
  await ensureWaitlistTabAndHeaders();
  const sheets = await getSheets();

  const existingRow = await findWaitlistRowByEmail(email);
  const firstName = name.split(' ')[0];

  if (existingRow) {
    // Update timestamp and name on existing row, leave challenge alone
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${WAITLIST_SHEET_NAME}'!A${existingRow}:D${existingRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[nowEST(), firstName, email, source]] },
    });
  } else {
    await appendWaitlistRow([nowEST(), firstName, email, source, '', '']);
  }
}

// ── Applications tab (waitlist-to-application shift) ──

const APPLICATIONS_SHEET_NAME = 'Applications';

const APPLICATION_HEADERS = [
  'Timestamp', 'First Name', 'Email', 'Phone', 'Channel URL',
  'Primary Goal', 'Monetized', 'Channel About', 'Target Audience',
  'Challenge', 'Program Goals', 'Readiness', 'Anything Else',
  'UTM Source', 'UTM Medium', 'UTM Campaign',
  // AI research + verdict (filled post-submission in Phase 2)
  'Subscribers', 'Total Videos', 'Avg Views', 'Upload Cadence', 'Content Type', 'Shorts',
  'AI Route', 'AI Evaluation', 'AI Confidence',
  // Outreach tracking (mirrors the Waitlist tab habit)
  'Contacted', 'Method', 'Loom URL', 'Opener Variant', 'Response', 'Response Date', 'Outreach', 'Notes',
];
const APPLICATION_LAST_COL = 'AG'; // 33 columns, A through AG

async function findApplicationRowByEmail(email: string): Promise<number | null> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${APPLICATIONS_SHEET_NAME}'!C:C`,
  });
  const rows = res.data.values || [];
  const norm = email.toLowerCase().trim();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i]?.[0]?.toLowerCase().trim() === norm) return i + 1;
  }
  return null;
}

async function ensureApplicationsTabAndHeaders(): Promise<void> {
  const sheets = await getSheets();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === APPLICATIONS_SHEET_NAME);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: APPLICATIONS_SHEET_NAME } } }] },
    });
  }
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${APPLICATIONS_SHEET_NAME}'!A1:${APPLICATION_LAST_COL}1`,
  });
  const existing = headerRes.data.values?.[0] || [];
  if (existing[0] !== APPLICATION_HEADERS[0]) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${APPLICATIONS_SHEET_NAME}'!A1:${APPLICATION_LAST_COL}1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [APPLICATION_HEADERS] },
    });
  }
}

async function appendApplicationRow(row: string[]): Promise<number> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${APPLICATIONS_SHEET_NAME}'!C:C`,
  });
  const emailCol = res.data.values || [];
  let nextRow = emailCol.length + 1;
  for (let i = 1; i < emailCol.length; i++) {
    if (!emailCol[i] || !emailCol[i][0] || emailCol[i][0].trim() === '') { nextRow = i + 1; break; }
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${APPLICATIONS_SHEET_NAME}'!A${nextRow}:${APPLICATION_LAST_COL}${nextRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
  return nextRow;
}

export interface ApplicationRecord {
  first_name?: string; email: string; phone?: string; channel_url?: string;
  primary_goal?: string; monetized?: string; channel_about?: string; target_audience?: string;
  challenge?: string; program_goals?: string; readiness?: string; anything_else?: string;
  utm_source?: string; utm_medium?: string; utm_campaign?: string;
}

/**
 * Append a new application. If the email already exists, overwrites the answer
 * columns (A:P) on the existing row and leaves the AI + outreach columns alone.
 * Returns the 1-based row number written to.
 */
export async function appendApplicationEntry(a: ApplicationRecord): Promise<number> {
  await ensureApplicationsTabAndHeaders();
  const sheets = await getSheets();
  const firstName = (a.first_name || '').split(' ')[0];
  const answerCols = [
    nowEST(), firstName, a.email, a.phone || '', a.channel_url || '',
    a.primary_goal || '', a.monetized || '', a.channel_about || '', a.target_audience || '',
    a.challenge || '', a.program_goals || '', a.readiness || '', a.anything_else || '',
    a.utm_source || '', a.utm_medium || '', a.utm_campaign || '',
  ];
  const existingRow = await findApplicationRowByEmail(a.email);
  if (existingRow) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${APPLICATIONS_SHEET_NAME}'!A${existingRow}:P${existingRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [answerCols] },
    });
    return existingRow;
  }
  const fullRow = [...answerCols, ...new Array(APPLICATION_HEADERS.length - answerCols.length).fill('')];
  return appendApplicationRow(fullRow);
}

/**
 * Update the Challenge column for an existing waitlist entry.
 * Creates the row if it doesn't exist (defensive — shouldn't happen in normal flow).
 */
export async function updateWaitlistChallenge(
  email: string,
  challenge: string,
  name?: string,
): Promise<void> {
  await ensureWaitlistTabAndHeaders();
  const sheets = await getSheets();

  const existingRow = await findWaitlistRowByEmail(email);

  if (existingRow) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${WAITLIST_SHEET_NAME}'!E${existingRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[challenge]] },
    });
  } else {
    // No row found — create one with the challenge filled in
    await appendWaitlistRow([
      nowEST(),
      name?.split(' ')[0] || '',
      email,
      'orphan-challenge',
      challenge,
      '',
    ]);
  }
}

/**
 * Update a row with questionnaire answers.
 * Finds existing row by email and updates in place, or creates new.
 */
export async function upsertQuestionnaireAnswers(
  email: string,
  name: string | undefined,
  answers: Record<string, string>,
): Promise<void> {
  const sheets = await getSheets();
  const existingRow = await findRowByEmail(email);

  const answerMap: Record<string, number> = {
    channel_url: COL.CHANNEL_URL,
    monetized: COL.MONETIZED,
    ai_comfort: COL.AI_COMFORT,
    hours_per_week: COL.HOURS_PER_WEEK,
    best_video_theory: COL.BEST_VIDEO_THEORY,
    what_didnt_work: COL.WHAT_DIDNT_WORK,
    content_goals: COL.CONTENT_GOALS,
    program_goals: COL.PROGRAM_GOALS,
    challenge: COL.CHALLENGE,
    analytics_access: COL.ANALYTICS_ACCESS,
  };

  if (existingRow) {
    const row = await getRowData(existingRow);

    // Update questionnaire timestamp (keep original payment timestamp in notes if needed)
    if (name) row[COL.FIRST_NAME] = name.split(' ')[0];
    row[COL.QUESTIONNAIRE_SUB] = 'Yes';

    for (const [key, colIdx] of Object.entries(answerMap)) {
      if (answers[key]) row[colIdx] = answers[key];
    }

    await writeRow(existingRow, row);
  } else {
    // No existing row — create one (shouldn't normally happen if payment came first)
    const row = new Array(TOTAL_COLS).fill('');
    row[COL.TIMESTAMP] = nowEST();
    if (name) row[COL.FIRST_NAME] = name.split(' ')[0];
    row[COL.EMAIL] = email;
    row[COL.QUESTIONNAIRE_SUB] = 'Yes';

    for (const [key, colIdx] of Object.entries(answerMap)) {
      if (answers[key]) row[colIdx] = answers[key];
    }

    await appendRow(row);
  }
}
