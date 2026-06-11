"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSpreadsheetMetadata = exports.updateSpreadsheetData = exports.getSpreadsheetData = exports.getAuthenticatedClient = void 0;
const googleapis_1 = require("googleapis");
const google_1 = require("../config/google");
const GoogleSheets_1 = require("../models/GoogleSheets");
// Helper to get authenticated Google OAuth2 client with auto-refresh capability
const getAuthenticatedClient = async (userId) => {
    const gSheets = await GoogleSheets_1.GoogleSheets.findOne({ userId });
    if (!gSheets) {
        throw new Error('Google integration is not connected.');
    }
    const oauth2Client = (0, google_1.getGoogleOAuth2Client)();
    oauth2Client.setCredentials({
        access_token: gSheets.accessToken,
        refresh_token: gSheets.refreshToken || undefined,
        expiry_date: gSheets.expiryDate || undefined
    });
    // Automatically save refreshed tokens back to database
    oauth2Client.on('tokens', async (tokens) => {
        const updateFields = { connectedAt: new Date() };
        if (tokens.access_token) {
            updateFields.accessToken = tokens.access_token;
        }
        if (tokens.refresh_token) {
            updateFields.refreshToken = tokens.refresh_token;
        }
        if (tokens.expiry_date) {
            updateFields.expiryDate = tokens.expiry_date;
        }
        await GoogleSheets_1.GoogleSheets.findOneAndUpdate({ userId }, updateFields);
    });
    return oauth2Client;
};
exports.getAuthenticatedClient = getAuthenticatedClient;
// Fetch rows & columns from a Google Sheet
const getSpreadsheetData = async (userId, spreadsheetId, sheetName = 'Sheet1') => {
    const auth = await (0, exports.getAuthenticatedClient)(userId);
    const sheets = googleapis_1.google.sheets({ version: 'v4', auth });
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
    const rows = [];
    for (let i = 1; i < values.length; i++) {
        const rowObj = {};
        columns.forEach((col, idx) => {
            rowObj[col] = values[i][idx] === undefined ? '' : values[i][idx];
        });
        rows.push(rowObj);
    }
    return { columns, rows };
};
exports.getSpreadsheetData = getSpreadsheetData;
// Write modified JSON array back to Google Sheet
const updateSpreadsheetData = async (userId, spreadsheetId, sheetName = 'Sheet1', columns, rows) => {
    const auth = await (0, exports.getAuthenticatedClient)(userId);
    const sheets = googleapis_1.google.sheets({ version: 'v4', auth });
    // Clear existing sheet data first
    await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A1:Z10000`
    });
    // Prepare 2D array
    const values2D = [columns];
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
exports.updateSpreadsheetData = updateSpreadsheetData;
// List sheet names for a spreadsheet
const getSpreadsheetMetadata = async (userId, spreadsheetId) => {
    const auth = await (0, exports.getAuthenticatedClient)(userId);
    const sheets = googleapis_1.google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.get({
        spreadsheetId
    });
    const title = response.data.properties?.title || 'Untitled Spreadsheet';
    const sheetsList = (response.data.sheets || []).map(s => s.properties?.title || '');
    return { title, sheets: sheetsList };
};
exports.getSpreadsheetMetadata = getSpreadsheetMetadata;
