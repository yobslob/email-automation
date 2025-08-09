// lib/sheets.js
import { google } from 'googleapis';

function createOAuthClient(accessToken) {
    const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );
    if (!accessToken) {
        throw new Error('No Google access token provided to sheets helper');
    }
    client.setCredentials({ access_token: accessToken });
    return client;
}

export async function getSheetColumns(accessToken, spreadsheetId) {
    try {
        const auth = createOAuthClient(accessToken);
        const sheets = google.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1!1:1',
        });
        if (!response.data || !response.data.values || !response.data.values[0]) {
            return [];
        }
        return response.data.values[0];
    } catch (err) {
        console.error('getSheetColumns error:', err);
        throw err;
    }
}

export async function getSheetData(accessToken, spreadsheetId) {
    try {
        const auth = createOAuthClient(accessToken);
        const sheets = google.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1!A2:Z',
        });
        return response.data.values || [];
    } catch (err) {
        console.error('getSheetData error:', err);
        throw err;
    }
}

export async function updateSheetStatus(accessToken, spreadsheetId, range, value) {
    try {
        const auth = createOAuthClient(accessToken);
        const sheets = google.sheets({ version: 'v4', auth });
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            resource: { values: [[value]] },
        });
        return { success: true };
    } catch (err) {
        console.error('updateSheetStatus error:', err);
        return { success: false, error: err.message };
    }
}
