import { google } from 'googleapis';
import { getGoogleOAuth2Client } from '../config/google';
import { GoogleSheets } from '../models/GoogleSheets';

// Helper to get authenticated Google OAuth2 client with auto-refresh capability
export const getAuthenticatedClient = async (userId: string) => {
  const gSheets = await GoogleSheets.findOne({ userId });
  if (!gSheets) {
    throw new Error('Google integration is not connected.');
  }

  const oauth2Client = getGoogleOAuth2Client();
  oauth2Client.setCredentials({
    access_token: gSheets.accessToken,
    refresh_token: gSheets.refreshToken || undefined,
    expiry_date: gSheets.expiryDate || undefined
  });

  // Automatically save refreshed tokens back to database
  oauth2Client.on('tokens', async (tokens) => {
    const updateFields: any = { connectedAt: new Date() };
    if (tokens.access_token) {
      updateFields.accessToken = tokens.access_token;
    }
    if (tokens.refresh_token) {
      updateFields.refreshToken = tokens.refresh_token;
    }
    if (tokens.expiry_date) {
      updateFields.expiryDate = tokens.expiry_date;
    }
    
    await GoogleSheets.findOneAndUpdate(
      { userId },
      updateFields
    );
  });

  return oauth2Client;
};

// Fetch rows & columns from a Google Sheet
export const getSpreadsheetData = async (
  userId: string,
  spreadsheetId: string,
  sheetName = 'Sheet1'
): Promise<{ columns: string[]; rows: Record<string, any>[] }> => {
  const auth = await getAuthenticatedClient(userId);
  const sheets = google.sheets({ version: 'v4', auth });
  
  // Get spreadsheet structure to know columns and content
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:Z5000` // default wide range, read up to 5000 rows
  });

  const values = response.data.values || [];
  if (values.length === 0) {
    return { columns: [], rows: [] };
  }

  const columns = values[0];
  const rows: Record<string, any>[] = [];

  for (let i = 1; i < values.length; i++) {
    const rowObj: Record<string, any> = {};
    columns.forEach((col: string, idx: number) => {
      rowObj[col] = values[i][idx] === undefined ? '' : values[i][idx];
    });
    rows.push(rowObj);
  }

  return { columns, rows };
};

// Write modified JSON array back to Google Sheet
export const updateSpreadsheetData = async (
  userId: string,
  spreadsheetId: string,
  sheetName = 'Sheet1',
  columns: string[],
  rows: Record<string, any>[]
): Promise<void> => {
  const auth = await getAuthenticatedClient(userId);
  const sheets = google.sheets({ version: 'v4', auth });

  // Clear existing sheet data first
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetName}!A1:Z10000`
  });

  // Prepare 2D array
  const values2D: any[][] = [columns];
  rows.forEach((row) => {
    const rowArr = columns.map(col => row[col] === undefined ? '' : row[col]);
    values2D.push(rowArr);
  });

  // Write values
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: values2D
    }
  });
};

// List sheet names for a spreadsheet
export const getSpreadsheetMetadata = async (
  userId: string,
  spreadsheetId: string
): Promise<{ title: string; sheets: string[] }> => {
  const auth = await getAuthenticatedClient(userId);
  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.get({
    spreadsheetId
  });

  const title = response.data.properties?.title || 'Untitled Spreadsheet';
  const sheetsList = (response.data.sheets || []).map(s => s.properties?.title || '');

  return { title, sheets: sheetsList };
};
