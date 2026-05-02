/**
 * Google Sheets API integration for the BCP questionnaire responses sheet.
 *
 * Sheet: "Form Responses 1" in spreadsheet 1lpnkxlN21slJwdItDr9Q-fzMcS5tzRz1l4fpqT8Oa6c
 *
 * Column order (A-Z):
 *   A: Timestamp
 *   B: First Name
 *   C: Email
 *   D: Channel URL
 *   E: Questionnaire Submitted?
 *   F: Active Creator
 *   G: Duration
 *   H: Subscribers
 *   I: Total Videos
 *   J: Channel Age
 *   K: Upload Cadence
 *   L: Content Type
 *   M: Target Audience
 *   N: Top Videos
 *   O: Bottom Videos
 *   P: Average Views (30 Days)
 *   Q: Shorts Evaluation
 *   R: Monetized?
 *   S: Comfortable with AI?
 *   T: Hours per Week
 *   U: Best Video Theory
 *   V: Hasn't worked?
 *   W: Content Goals
 *   X: Program Goals
 *   Y: Challenge
 *   Z: Analytics Access
 */

const SPREADSHEET_ID = process.env.BCP_SHEET_ID || '1lpnkxlN21slJwdItDr9Q-fzMcS5tzRz1l4fpqT8Oa6c';
const SHEET_NAME = 'Form Responses 1';
const RANGE_ALL = `'${SHEET_NAME}'!A:Z`;

// Column indices (0-based)
const COL = {
  TIMESTAMP: 0,
  FIRST_NAME: 1,
  EMAIL: 2,
  CHANNEL_URL: 3,
  QUESTIONNAIRE_SUB: 4,
  ACTIVE_CREATOR: 5,
  DURATION: 6,
  SUBSCRIBERS: 7,
  TOTAL_VIDEOS: 8,
  CHANNEL_AGE: 9,
  UPLOAD_CADENCE: 10,
  CONTENT_TYPE: 11,
  TARGET_AUDIENCE: 12,
  TOP_VIDEOS: 13,
  BOTTOM_VIDEOS: 14,
  AVG_VIEWS_30D: 15,
  SHORTS_EVAL: 16,
  MONETIZED: 17,
  AI_COMFORT: 18,
  HOURS_PER_WEEK: 19,
  BEST_VIDEO_THEORY: 20,
  WHAT_DIDNT_WORK: 21,
  CONTENT_GOALS: 22,
  PROGRAM_GOALS: 23,
  CHALLENGE: 24,
  ANALYTICS_ACCESS: 25,
} as const;

async function getSheets() {
  // Dynamic import to avoid bundling issues — googleapis is server-only
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

function now(): string {
  return new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
}

/**
 * Find a row by email. Returns the 1-based row number or null.
 */
async function findRowByEmail(email: string): Promise<number | null> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!C:C`, // Email column
  });

  const rows = res.data.values || [];
  const normalizedEmail = email.toLowerCase().trim();

  for (let i = 1; i < rows.length; i++) { // skip header
    if (rows[i]?.[0]?.toLowerCase().trim() === normalizedEmail) {
      return i + 1; // 1-based row number
    }
  }
  return null;
}

/**
 * Create a placeholder row when someone pays (before questionnaire).
 */
export async function createPaymentRow(name: string, email: string): Promise<void> {
  const sheets = await getSheets();

  // Check if they already have a row (e.g. from a previous cohort or duplicate webhook)
  const existingRow = await findRowByEmail(email);
  if (existingRow) {
    console.log(`Sheet row already exists for ${email} at row ${existingRow}, skipping placeholder`);
    return;
  }

  const row = new Array(26).fill('');
  row[COL.TIMESTAMP] = now();
  row[COL.FIRST_NAME] = name.split(' ')[0];
  row[COL.EMAIL] = email;
  row[COL.QUESTIONNAIRE_SUB] = 'No';

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE_ALL,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

/**
 * Update a row with questionnaire answers. If the row exists (from payment),
 * updates it in place. If not, creates a new row.
 */
export async function upsertQuestionnaireAnswers(
  email: string,
  name: string | undefined,
  answers: Record<string, string>,
): Promise<void> {
  const sheets = await getSheets();
  const existingRow = await findRowByEmail(email);

  // Map answer keys to column indices
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
    // Update existing row in place
    const row = new Array(26).fill('');

    // Get current row data to preserve existing values
    const current = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A${existingRow}:Z${existingRow}`,
    });
    const currentValues = current.data.values?.[0] || [];

    // Start with current values
    for (let i = 0; i < 26; i++) {
      row[i] = currentValues[i] || '';
    }

    // Update timestamp and name if we have it
    row[COL.TIMESTAMP] = now();
    if (name) row[COL.FIRST_NAME] = name.split(' ')[0];
    row[COL.QUESTIONNAIRE_SUB] = 'Yes';

    // Fill in answers
    for (const [key, colIdx] of Object.entries(answerMap)) {
      if (answers[key]) {
        row[colIdx] = answers[key];
      }
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A${existingRow}:Z${existingRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
  } else {
    // No existing row — create new one
    const row = new Array(26).fill('');
    row[COL.TIMESTAMP] = now();
    if (name) row[COL.FIRST_NAME] = name.split(' ')[0];
    row[COL.EMAIL] = email;
    row[COL.QUESTIONNAIRE_SUB] = 'Yes';

    for (const [key, colIdx] of Object.entries(answerMap)) {
      if (answers[key]) {
        row[colIdx] = answers[key];
      }
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE_ALL,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
  }
}
