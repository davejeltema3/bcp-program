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
 *   AD: End Date             — Start + 90 days default. Edit to extend/shorten.
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

function endDateFromStart(startDate: string, days: number = 90): string {
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
 */
async function appendRow(row: string[]): Promise<void> {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE_ALL,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
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
  const endDate = endDateFromStart(startDate, 90);

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
    row[COL.DAYS_REMAINING] = '90';
    row[COL.PAYMENT_TYPE] = opts.paymentType || 'one-time';
    row[COL.AMOUNT_PAID] = opts.amountPaid ? `${opts.amountPaid}` : '';
    row[COL.TOTAL_REVENUE] = opts.amountPaid ? `${opts.amountPaid}` : '';
    row[COL.RENEWAL_COUNT] = '1';

    if (opts.stripeCustomerId) row[COL.STRIPE_CUSTOMER] = opts.stripeCustomerId;
    if (opts.stripeSessionId) row[COL.STRIPE_SESSION] = opts.stripeSessionId;
    if (opts.discordInviteUrl) row[COL.DISCORD_INVITE] = opts.discordInviteUrl;

    await appendRow(row);

    // Now find the row we just appended and set formulas
    const newRowNum = await findRowByEmail(email);
    if (newRowNum) {
      const sheets = await getSheets();
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!AE${newRowNum}:AF${newRowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[statusFormula(newRowNum), daysRemainingFormula(newRowNum)]] },
      });
    }

    console.log(`Created new row for ${email}`);
  }
}

/**
 * Add a comp/manual member (no Stripe payment).
 * Used from the admin page.
 */
export async function addCompMember(
  name: string,
  email: string,
  durationDays: number = 90,
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

    await appendRow(row);

    const newRowNum = await findRowByEmail(email);
    if (newRowNum) {
      const sheets = await getSheets();
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!AE${newRowNum}:AF${newRowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[statusFormula(newRowNum), daysRemainingFormula(newRowNum)]] },
      });
    }

    return { isNew: true };
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
