// app/api/sheets-rpc/route.ts
//
// Generic Google Sheets write endpoint. Callable from anywhere with the token:
//
//   POST https://bcp.boundlesscreator.com/api/sheets-rpc
//   body: { token, action, params: { spreadsheetId?, ... } }
//
// Auth: shared token in env var SHEETS_RPC_TOKEN.
// Sheets access: service account JSON in env var GOOGLE_SERVICE_ACCOUNT_JSON
//   (already used by lib/sheets.ts for the waitlist flow).
//
// The spreadsheetId param defaults to the BCP Members Sheet if omitted.
// To address another Sheet, pass spreadsheetId AND share the service
// account email on that Sheet as Editor.
//
// Service account email: hazel-youtube-drive@davejeltemadotco-1699158105209.iam.gserviceaccount.com
//
// Source-of-truth docs for this endpoint:
//   Outputs/projects/Integrations/services/google-sheets.md in the Cowork workspace.

import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

// Falls back to BCP_SHEET_ID env var (already set in Vercel for the existing
// waitlist flow) before falling back to the hardcoded id.
const DEFAULT_SPREADSHEET_ID = process.env.BCP_SHEET_ID || "1lpnkxlN21slJwdItDr9Q-fzMcS5tzRz1l4fpqT8Oa6c";
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

function getSheetsClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON env var not set");
  const credentials = JSON.parse(raw);
  const auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
  return google.sheets({ version: "v4", auth });
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const expectedToken = process.env.SHEETS_RPC_TOKEN;
  if (!expectedToken) {
    return NextResponse.json({ ok: false, error: "SHEETS_RPC_TOKEN env var not set" }, { status: 500 });
  }
  if (body.token !== expectedToken) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const action: string = body.action;
  const params = body.params || {};
  const spreadsheetId: string = params.spreadsheetId || DEFAULT_SPREADSHEET_ID;

  try {
    const sheets = getSheetsClient();

    switch (action) {
      case "ping": {
        const r = await sheets.spreadsheets.get({ spreadsheetId });
        return NextResponse.json({
          ok: true,
          spreadsheet: r.data.properties?.title,
          sheets: r.data.sheets?.map(s => s.properties?.title) || [],
        });
      }

      case "getValues": {
        // params: { sheet, range }  -> reads A1 range under the given sheet
        const r = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${params.sheet}!${params.range}`,
        });
        return NextResponse.json({ ok: true, values: r.data.values || [] });
      }

      case "updateCell": {
        // params: { sheet, row, col, value }  -> writes one value to one cell
        const a1 = `${params.sheet}!${colNumToLetter(params.col)}${params.row}`;
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: a1,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [[params.value]] },
        });
        return NextResponse.json({ ok: true });
      }

      case "updateRange": {
        // params: { sheet, range, values }  -> writes a 2D array to an A1 range
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${params.sheet}!${params.range}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: params.values },
        });
        return NextResponse.json({ ok: true });
      }

      case "appendRow": {
        // params: { sheet, values: [...] }
        // Uses Sheets API insertDataOption: INSERT_ROWS to avoid the
        // formatting-extends-down trap (rows go right after the last row
        // of data, not after any pre-formatted empty rows below).
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${params.sheet}!A:A`,
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values: [params.values] },
        });
        return NextResponse.json({ ok: true });
      }

      case "addColumns": {
        // params: { sheet, columns: ["Col A", "Col B", ...] }
        // Adds the columns to the right of the existing header row if not
        // already present by name. Bold-faces the new headers.
        const ws = await getWorksheetMeta(sheets, spreadsheetId, params.sheet);
        if (!ws) return NextResponse.json({ ok: false, error: "sheet not found" }, { status: 404 });

        const headerRow = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${params.sheet}!1:1`,
        });
        const existing = new Set((headerRow.data.values?.[0] || []).map(String));
        const newCols: string[] = params.columns.filter((c: string) => !existing.has(c));

        if (newCols.length === 0) {
          return NextResponse.json({ ok: true, added: [], note: "all columns already present" });
        }

        const startColIdx = (headerRow.data.values?.[0]?.length || 0) + 1;
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${params.sheet}!${colNumToLetter(startColIdx)}1:${colNumToLetter(startColIdx + newCols.length - 1)}1`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [newCols] },
        });

        // Bold the new header cells via batchUpdate
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              repeatCell: {
                range: {
                  sheetId: ws.sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: startColIdx - 1,
                  endColumnIndex: startColIdx - 1 + newCols.length,
                },
                cell: { userEnteredFormat: { textFormat: { bold: true } } },
                fields: "userEnteredFormat.textFormat.bold",
              },
            }],
          },
        });

        return NextResponse.json({ ok: true, added: newCols, startCol: startColIdx });
      }

      case "findRow": {
        // params: { sheet, column: "C" or 3, value: "..." }
        // Returns the 1-based row index where the column matches the value,
        // or null if not found.
        const colIdx = typeof params.column === "string"
          ? params.column.toUpperCase().charCodeAt(0) - 64
          : params.column;
        const r = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${params.sheet}!${colNumToLetter(colIdx)}:${colNumToLetter(colIdx)}`,
        });
        const vals = r.data.values || [];
        for (let i = 0; i < vals.length; i++) {
          if (vals[i][0] === params.value) {
            return NextResponse.json({ ok: true, row: i + 1 });
          }
        }
        return NextResponse.json({ ok: true, row: null });
      }

      case "addSheet": {
        // params: { name }
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{ addSheet: { properties: { title: params.name } } }],
          },
        });
        return NextResponse.json({ ok: true });
      }

      case "getSheetId": {
        // params: { sheet } -> numeric sheetId for the tab (needed by batchUpdate formatting)
        const ws = await getWorksheetMeta(sheets, spreadsheetId, params.sheet);
        if (!ws) return NextResponse.json({ ok: false, error: "sheet not found" }, { status: 404 });
        return NextResponse.json({ ok: true, sheetId: ws.sheetId });
      }

      case "batchUpdate": {
        // params: { requests: [...] } -> raw Sheets API spreadsheets.batchUpdate requests.
        // Enables formatting: freeze panes, column widths, wrap, basic filter (sorting),
        // tab colors, header fills, cell notes, etc. Look up numeric sheetIds via getSheetId.
        const r = await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: { requests: params.requests || [] },
        });
        return NextResponse.json({ ok: true, replies: r.data.replies || [] });
      }

      case "addConditionalFormat": {
        // params: { sheet, formula, background? }
        // Adds one custom-formula conditional-format rule. Used to grey out
        // refunded/inactive member rows so they read at a glance from the left
        // without scrolling to the Status column.
        const ws = await getWorksheetMeta(sheets, spreadsheetId, params.sheet);
        if (!ws) return NextResponse.json({ ok: false, error: "sheet not found" }, { status: 404 });
        const bg = params.background || { red: 0.85, green: 0.85, blue: 0.85 };
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              addConditionalFormatRule: {
                index: 0,
                rule: {
                  ranges: [{ sheetId: ws.sheetId, startRowIndex: 1 }],
                  booleanRule: {
                    condition: {
                      type: "CUSTOM_FORMULA",
                      values: [{ userEnteredValue: params.formula }],
                    },
                    format: { backgroundColor: bg },
                  },
                },
              },
            }],
          },
        });
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ ok: false, error: `unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err.message || err) }, { status: 500 });
  }
}

async function getWorksheetMeta(sheets: any, spreadsheetId: string, sheetName: string) {
  const r = await sheets.spreadsheets.get({ spreadsheetId });
  const ws = r.data.sheets?.find((s: any) => s.properties?.title === sheetName);
  return ws?.properties || null;
}

function colNumToLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
